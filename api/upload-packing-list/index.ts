

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const supplier = formData.get('supplier') as string || 'N/A';

    if (!file) {
      throw new Error("No file provided.");
    }

    const csvContent = await file.text();
    const parsedData = parseCsv(csvContent);

    // 1. Get all unique SKUs from the CSV to fetch corresponding products in one go
    const skus = [...new Set(parsedData.map(row => row.sku))];
    const { data: products, error: productError } = await supabaseClient
      .from('products')
      .select('id, sku, product_type')
      .in('sku', skus);

    if (productError) throw productError;

    const productMap = new Map(products.map(p => [p.sku, { id: p.id, type: p.product_type }]));

    // 2. Create a new packing list record
    const { data: packingList, error: packingListError } = await supabaseClient
      .from('packing_lists')
      .insert({ supplier_name: supplier, arrival_date: new Date().toISOString() })
      .select()
      .single();

    if (packingListError) throw packingListError;

    // 3. Prepare inventory items for insertion
    const inventoryItemsToInsert = parsedData.map(row => {
      const productInfo = productMap.get(row.sku);
      if (!productInfo || !productInfo.type) {
        console.warn(`SKU not found or product type is missing, skipping row: ${row.sku}`);
        return null;
      }
      return {
        product_id: productInfo.id,
        product_type: productInfo.type, // <-- FIX: Add product_type
        packing_list_id: packingList.id,
        serial_number: row.serial_number,
        status: 'en_verificacion',
        meterage: parseFloat(row.meterage) || 0, // Accept if present, default to 0
        weight_kg: parseFloat(row.weight_kg) || 0, // Accept if present, default to 0
        notes: `Imported from CSV - SKU: ${row.sku}`
      };
    }).filter(Boolean); // Filter out nulls for SKUs not found

    if (inventoryItemsToInsert.length === 0) {
        throw new Error("No valid inventory items could be processed from the file.");
    }

    // 4. Insert all new inventory items
    const { error: insertError } = await supabaseClient
      .from('inventory_items')
      .insert(inventoryItemsToInsert);

    if (insertError) {
      // If item insertion fails, delete the orphaned packing list to keep data consistent
      await supabaseClient.from('packing_lists').delete().eq('id', packingList.id);
      throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      packingListId: packingList.id, 
      itemCount: inventoryItemsToInsert.length 
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

