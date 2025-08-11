import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError("Credenciales incorrectas. Por favor, intenta de nuevo.");
      }
    } catch (err) {
      setError("Error al iniciar sesión. Por favor, intenta de nuevo.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo con animación de entrada */}
        <div className="text-center mb-8 animate-fade-in">
          {/*<img
            src="/blackwitch.gif"
            alt="Black Witch Logo"
            className="mx-auto h-28 w-auto mb-4 drop-shadow-lg transition-opacity duration-300 ease-in-out"
          />*/}
          <h1
            className="text-3xl font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--primary), var(--secondary))",
            }}
          >
            LogiCarga WMS
          </h1>
          <p className="mt-2" style={{ color: "var(--muted-foreground)" }}>
            Sistema de Gestión de Almacenes
          </p>
        </div>

        {/* Card de login con animación */}
        <Card
          className="animate-fade-in shadow-2xl border-0 backdrop-blur-sm"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
          }}
        >
          <CardHeader className="text-center pb-4">
            <CardTitle
              className="text-2xl font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Iniciar Sesión
            </CardTitle>
            <CardDescription style={{ color: "var(--muted-foreground)" }}>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  style={{ color: "var(--foreground)" }}
                >
                  Usuario
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="transition-all duration-300 focus:ring-2"
                  style={
                    {
                      backgroundColor: "var(--input)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      "--tw-ring-color": "var(--ring)",
                    } as React.CSSProperties
                  } // Forzamos el tipo aquí
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  style={{ color: "var(--foreground)" }}
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="transition-all duration-300 focus:ring-2 pr-10"
                    style={
                      {
                        backgroundColor: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                        "--tw-ring-color": "var(--ring)",
                      } as React.CSSProperties
                    } // Forzamos el tipo aquí
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert
                  className="animate-pulse"
                  style={{
                    backgroundColor: "var(--destructive)",
                    borderColor: "var(--destructive-foreground)",
                  }}
                >
                  <AlertDescription
                    style={{ color: "var(--destructive-foreground)" }}
                  >
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full font-semibold py-3 transition-all duration-300 transform hover:scale-105 shadow-lg"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--primary), var(--secondary))",
                  color: "var(--primary-foreground)",
                }}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer con información */}
        <div
          className="text-center mt-8 text-sm animate-fade-in"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p>© 2025 LogiCarga WMS. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};
