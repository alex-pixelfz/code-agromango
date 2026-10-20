package com.agromango.app;

import com.agromango.model.Cliente;
import com.agromango.model.RegistroAcopio;

// Punto de entrada principal para probar el MVP
public class Main {
    public static void main(String[] args) {
        // 1. Crear un cliente
        Cliente productor = new Cliente(1, "Don Carlos Gomez", "573001234567");

        // 2. Crear una transacción de acopio
        RegistroAcopio registro = new RegistroAcopio(
            101, productor, "Mango Yulima", "Primera", 35000.0, 50, 20, 500000.0
        );

        // 3. Mostrar resultados en consola
        System.out.println("=== COMPROBANTE DE ACOPIO ===");
        System.out.println("Productor: " + productor.getNombre());
        System.out.println("Saldo de Canastillas Pendientes: " + registro.calcularSaldoCanastillas());
        System.out.println("Total a Pagar Pendiente: $" + registro.calcularTotalPagar());
        System.out.println("\nEnlace para WhatsApp (RF-03):");
        System.out.println(registro.generarUrlWhatsApp());
    }
}