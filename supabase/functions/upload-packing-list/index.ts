import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
};

// Simple CSV parser
function parseCsv(csv: string) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {} as Record<string, string>);
  });
  return rows;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      }
    });
  }

  try {
    console.log('Starting CSV processing...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const supplier = formData.get('supplier') as string || 'N/A';

    console.log('Form data received:', { supplier, fileName: file?.name, fileSize: file?.size });

    if (!file) {
      throw new Error("No file provided.");
    }

    const csvContent = await file.text();
    console.log('CSV content length:', csvContent.length);
    console.log('CSV content preview:', csvContent.substring(0, 200));

    const parsedData = parseCsv(csvContent);
    console.log('Parsed CSV data:', parsedData);

    if (parsedData.length === 0) {
      throw new Error("El archivo CSV está vacío o no tiene datos válidos.");
    }

    // Validate CSV structure
    const requiredColumns = ['serial_number', 'sku', 'meterage', 'weight_kg'];
    const firstRow = parsedData[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
    }

    // 1. Get all unique SKUs from the CSV to fetch corresponding products in one go
    const skus = [...new Set(parsedData.map(row => row.sku))];
    console.log('SKUs found in CSV:', skus);
    
    const { data: products, error: productError } = await supabaseClient
      .from('products')
      .select('id, sku, product_type')
      .in('sku', skus);

    if (productError) {
      console.error('Error fetching products:', productError);
      throw productError;
    }

    console.log('Products found in database:', products);

    const productMap = new Map(products.map(p => [p.sku, { id: p.id, type: p.product_type }]));

    // Check which SKUs were not found
    const foundSkus = new Set(products.map(p => p.sku));
    const missingSkus = skus.filter(sku => !foundSkus.has(sku));
    
    if (missingSkus.length > 0) {
      console.warn(`SKUs not found: ${missingSkus.join(', ')}`);
    }

    // 2. Create a new packing list record
    const { data: packingList, error: packingListError } = await supabaseClient
      .from('packing_lists')
      .insert({ 
        supplier_name: supplier, 
        arrival_date: new Date().toISOString(),
        status: 'pendiente'
      })
      .select()
      .single();

    if (packingListError) {
      console.error('Error creating packing list:', packingListError);
      throw packingListError;
    }

    console.log('Packing list created:', packingList.id);

    // 3. Prepare inventory items for insertion
    const inventoryItemsToInsert = parsedData.map(row => {
      const productInfo = productMap.get(row.sku);
      if (!productInfo) {
        console.warn(`SKU not found, skipping row: ${row.sku}`);
        return null;
      }
      
      const meterage = row.meterage ? parseFloat(row.meterage) : null;
      const weightKg = row.weight_kg ? parseFloat(row.weight_kg) : null;
      
      console.log(`Processing row: SKU=${row.sku}, meterage=${meterage}, weight_kg=${weightKg}`);
      
      return {
        product_id: productInfo.id,
        packing_list_id: packingList.id,
        serial_number: row.serial_number,
        status: 'en_verificacion',
        product_type: productInfo.type, // Añadir el product_type
        meterage: productInfo.type === 'rollo_tela' ? meterage : null,
        weight_kg: productInfo.type === 'tanque_ibc' ? weightKg : null,
        notes: `Imported from CSV - SKU: ${row.sku}`
      };
    }).filter(Boolean); // Filter out nulls for SKUs not found

    console.log('Items to insert:', inventoryItemsToInsert.length);

    if (inventoryItemsToInsert.length === 0) {
      // If no valid items, delete the packing list and return error
      await supabaseClient.from('packing_lists').delete().eq('id', packingList.id);
      throw new Error(`No se pudieron procesar items válidos del archivo. SKUs no encontrados: ${missingSkus.join(', ')}`);
    }

    // 4. Insert all new inventory items
    const { error: insertError } = await supabaseClient
      .from('inventory_items')
      .insert(inventoryItemsToInsert);

    if (insertError) {
      console.error('Error inserting inventory items:', insertError);
      // Clean up the packing list if items fail to insert
      await supabaseClient.from('packing_lists').delete().eq('id', packingList.id);
      throw insertError;
    }

    console.log('Inventory items inserted successfully');

    return new Response(JSON.stringify({ 
      success: true,
      packingListId: packingList.id, 
      itemCount: inventoryItemsToInsert.length,
      skippedItems: parsedData.length - inventoryItemsToInsert.length,
      missingSkus: missingSkus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing packing list:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}); 