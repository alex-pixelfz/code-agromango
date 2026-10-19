// Clase principal que implementa los Requisitos Funcionales (RF-01, RF-02, RF-03)
public class RegistroAcopio {
    private int id;
    private Cliente cliente;
    private String tipoMango;
    private String calidad;
    private double precioCanastilla;
    private int canastillasEntregadas;
    private int canastillasDevueltas;
    private double abonoEfectivo;

    public RegistroAcopio(int id, Cliente cliente, String tipoMango, String calidad, 
                          double precioCanastilla, int canastillasEntregadas, 
                          int canastillasDevueltas, double abonoEfectivo) {
        this.id = id;
        this.cliente = cliente;
        this.tipoMango = tipoMango;
        this.calidad = calidad;
        this.precioCanastilla = precioCanastilla;
        this.canastillasEntregadas = canastillasEntregadas;
        this.canastillasDevueltas = canastillasDevueltas;
        this.abonoEfectivo = abonoEfectivo;
    }

    // RF-02: Fórmula automática del saldo de canastillas pendientes
    public int calcularSaldoCanastillas() {
        return canastillasEntregadas - canastillasDevueltas;
    }

    // Calcula el valor total de la carga menos el abono
    public double calcularTotalPagar() {
        double subtotal = canastillasEntregadas * precioCanastilla;
        return subtotal - abonoEfectivo;
    }

    // RF-03: Generación del enlace estructurado para enviar la tirilla por WhatsApp
    public String generarUrlWhatsApp() {
        String textoTirilla = "ACOPIO DE MANGO - COMPROBANTE%0A" +
                              "Productor: " + cliente.getNombre() + "%0A" +
                              "Variedad: " + tipoMango + " (" + calidad + ")%0A" +
                              "Canastillas Entregadas: " + canastillasEntregadas + "%0A" +
                              "Canastillas Devueltas: " + canastillasDevueltas + "%0A" +
                              "Saldo Canastillas: " + calcularSaldoCanastillas() + "%0A" +
                              "Abono Efectivo: $" + abonoEfectivo + "%0A" +
                              "Saldo Pendiente Pagar: $" + calcularTotalPagar();

        return "https://api.whatsapp.com/send?phone=" + cliente.getTelefono() + "&text=" + textoTirilla;
    }
}