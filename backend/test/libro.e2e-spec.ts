import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../src/app.module.js';

describe('Libro de entregas y cuenta (e2e)', () => {
  let app: INestApplication;
  let directorio: string;
  let archivoDatos: string;
  const anterior = {
    datos: process.env.DATOS_ARCHIVO,
    secreto: process.env.JWT_SECRET,
  };
  let tokenA = '';
  let clienteA = 0;
  let entregaA = 0;
  let abonosCreados: number[] = [];
  let contraseñaHeredada = '';
  let contraseñaA = '';
  let contraseñaB = '';

  beforeAll(async () => {
    directorio = mkdtempSync(join(tmpdir(), 'mangonota-libro-'));
    archivoDatos = join(directorio, 'datos.json');
    process.env.DATOS_ARCHIVO = archivoDatos;
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    contraseñaHeredada = randomBytes(24).toString('hex');
    contraseñaA = randomBytes(24).toString('hex');
    contraseñaB = randomBytes(24).toString('hex');
    const hashHeredado = await hash(contraseñaHeredada, 4);
    writeFileSync(
      archivoDatos,
      JSON.stringify({
        version: 1,
        usuarios: [
          {
            id: 5,
            usuario: 'heredado',
            usuarioNormalizado: 'heredado',
            contrasenaHash: hashHeredado,
          },
        ],
        clientes: [
          {
            id: 7,
            usuarioId: 5,
            nombre: 'Productor heredado',
            activo: true,
            creadoEn: new Date().toISOString(),
          },
        ],
        contadores: { usuario: 6, cliente: 8 },
      }),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    app.getHttpServer().setMaxListeners(30);
  });

  afterAll(async () => {
    await app?.close();
    if (anterior.datos === undefined) delete process.env.DATOS_ARCHIVO;
    else process.env.DATOS_ARCHIVO = anterior.datos;
    if (anterior.secreto === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = anterior.secreto;
    if (directorio) rmSync(directorio, { recursive: true, force: true });
  });

  it('preserva el formato anterior, calcula entregas y protege las cuentas', async () => {
    const server = request(app.getHttpServer());
    const loginHeredado = await server
      .post('/auth/login')
      .send({ usuario: 'heredado', contrasena: contraseñaHeredada })
      .expect(200);
    const tokenHeredado = loginHeredado.body.access_token as string;
    await server
      .get('/clientes/7')
      .set('Authorization', `Bearer ${tokenHeredado}`)
      .expect(200);

    await server
      .post('/auth/register')
      .send({ usuario: 'usuarioA', contrasena: contraseñaA })
      .expect(201);
    const loginA = await server
      .post('/auth/login')
      .send({ usuario: 'usuarioA', contrasena: contraseñaA })
      .expect(200);
    tokenA = loginA.body.access_token as string;
    const authorization = `Bearer ${tokenA}`;
    const cliente = await server
      .post('/clientes')
      .set('Authorization', authorization)
      .send({ nombre: 'Productor A' })
      .expect(201);
    clienteA = cliente.body.id as number;

    const hoy = new Date().toISOString().slice(0, 10);
    const entrega = await server
      .post('/entregas')
      .set('Authorization', authorization)
      .send({
        clienteId: clienteA,
        tipoMango: 'Tommy',
        calidad: 'PRIMERA',
        pesoKg: 120.5,
        precioPorKg: 2500,
        canastillasEntregadas: 10,
        fecha: hoy,
        totalPesos: 1,
        duenioId: 9999,
      })
      .expect(201);
    entregaA = entrega.body.id as number;
    expect(entrega.body.totalPesos).toBe(301250);
    expect(entrega.body.pesoKg).toBe(120.5);

    const segundo = await server
      .post('/entregas')
      .set('Authorization', authorization)
      .send({
        clienteId: clienteA,
        tipoMango: 'Keitt',
        calidad: 'SEGUNDA',
        pesoKg: 33.33,
        precioPorKg: 3000,
        canastillasEntregadas: 0,
      })
      .expect(201);
    expect(segundo.body.totalPesos).toBe(99990);
    const tercero = await server
      .post('/entregas')
      .set('Authorization', authorization)
      .send({
        clienteId: clienteA,
        tipoMango: 'Mango',
        calidad: 'TERCERA',
        pesoKg: 0.07,
        precioPorKg: 1234,
        canastillasEntregadas: 0,
      })
      .expect(201);
    expect(tercero.body.totalPesos).toBe(86);

    const simultaneos = await Promise.all(
      Array.from({ length: 10 }, () =>
        server
          .post('/abonos')
          .set('Authorization', authorization)
          .send({ clienteId: clienteA, montoPesos: 50000, fecha: hoy }),
      ),
    );
    expect(simultaneos.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    abonosCreados = simultaneos
      .filter((r) => r.status === 201)
      .map((r) => r.body.id as number);
    expect(abonosCreados).toHaveLength(8);
    expect(abonosCreados.length * 50000).toBeLessThanOrEqual(401326);
    await server
      .post('/abonos')
      .set('Authorization', authorization)
      .send({ clienteId: clienteA, montoPesos: 5000 })
      .expect(409);

    await server
      .post('/devoluciones')
      .set('Authorization', authorization)
      .send({ clienteId: clienteA, cantidad: 11 })
      .expect(409);
    const devolucion = await server
      .post('/devoluciones')
      .set('Authorization', authorization)
      .send({ clienteId: clienteA, cantidad: 10 })
      .expect(201);

    const cuenta = await server
      .get(`/clientes/${clienteA}/cuenta`)
      .set('Authorization', authorization)
      .expect(200);
    expect(cuenta.body.totalEntregadoPesos).toBe(401326);
    expect(cuenta.body.totalAbonadoPesos).toBe(400000);
    expect(cuenta.body.saldoPesos).toBe(1326);
    expect(cuenta.body.saldoCanastillas).toBe(0);
    expect(
      cuenta.body.movimientos.some((m: { descripcion: string }) =>
        m.descripcion.startsWith('...y '),
      ),
    ).toBe(true);

    await server
      .post(`/entregas/${entregaA}/anular`)
      .set('Authorization', authorization)
      .send({ motivo: 'Error al registrar' })
      .expect(409);
    await server
      .post(`/devoluciones/${devolucion.body.id}/anular`)
      .set('Authorization', authorization)
      .send({ motivo: 'Devolución mal anotada' })
      .expect(201);
    await server
      .post(`/devoluciones/${devolucion.body.id}/anular`)
      .set('Authorization', authorization)
      .send({ motivo: 'Otra vez' })
      .expect(409);
    for (const id of abonosCreados) {
      await server
        .post(`/abonos/${id}/anular`)
        .set('Authorization', authorization)
        .send({ motivo: 'Abono de prueba incorrecto' })
        .expect(201);
    }
    await server
      .post(`/entregas/${entregaA}/anular`)
      .set('Authorization', authorization)
      .send({ motivo: 'Entrega mal anotada' })
      .expect(201);
    await server
      .post(`/entregas/${entregaA}/anular`)
      .set('Authorization', authorization)
      .send({ motivo: 'Anulación repetida' })
      .expect(409);

    const sugerencias = await server
      .get(`/clientes/${clienteA}/sugerencias`)
      .set('Authorization', authorization)
      .expect(200);
    expect(sugerencias.body).toEqual({
      tipoMango: 'Mango',
      calidad: 'TERCERA',
      precioPorKg: 1234,
    });

    const comprobante = await server
      .get(`/clientes/${clienteA}/comprobante?entregaId=${tercero.body.id}`)
      .set('Authorization', authorization)
      .expect(200);
    expect(comprobante.body.texto).toContain('Falta por pagar');
    expect(comprobante.body.url).toContain('https://wa.me/?text=');
    expect(comprobante.body.url).toContain('%0A');

    await server.get('/cuentas').expect(401);
    await server
      .post('/entregas/abc/anular')
      .set('Authorization', authorization)
      .send({ motivo: 'Id incorrecto' })
      .expect(400);
    await server.get(`/clientes/${clienteA}/cuenta`).expect(401);

    await server
      .post('/auth/register')
      .send({ usuario: 'usuarioB', contrasena: contraseñaB })
      .expect(201);
    const loginB = await server
      .post('/auth/login')
      .send({ usuario: 'usuarioB', contrasena: contraseñaB })
      .expect(200);
    const authorizationB = `Bearer ${loginB.body.access_token as string}`;
    await server
      .get(`/clientes/${clienteA}/cuenta`)
      .set('Authorization', authorizationB)
      .expect(404);
    await server
      .get(`/clientes/${clienteA}`)
      .set('Authorization', authorizationB)
      .expect(404);
    await server
      .patch(`/clientes/${clienteA}`)
      .set('Authorization', authorizationB)
      .send({ nombre: 'Cambio ajeno' })
      .expect(404);
    await server.get('/entregas').set('Authorization', authorizationB).expect(200).expect([]);
    await server.get('/abonos').set('Authorization', authorizationB).expect(200).expect([]);
    await server.get('/devoluciones').set('Authorization', authorizationB).expect(200).expect([]);
    await server
      .post('/entregas')
      .set('Authorization', authorizationB)
      .send({
        clienteId: clienteA,
        tipoMango: 'Tommy',
        calidad: 'PRIMERA',
        pesoKg: 10,
        precioPorKg: 1000,
        canastillasEntregadas: 0,
      })
      .expect(404);
    await server
      .post('/abonos')
      .set('Authorization', authorizationB)
      .send({ clienteId: clienteA, montoPesos: 1 })
      .expect(404);
    await server
      .post('/devoluciones')
      .set('Authorization', authorizationB)
      .send({ clienteId: clienteA, cantidad: 1 })
      .expect(404);
    const cuentasB = await server
      .get('/cuentas')
      .set('Authorization', authorizationB)
      .expect(200);
    expect(cuentasB.body).toEqual([]);

    const clienteArchivado = await server
      .post('/clientes')
      .set('Authorization', authorization)
      .send({ nombre: 'Cliente archivado' })
      .expect(201);
    await server
      .patch(`/clientes/${clienteArchivado.body.id as number}`)
      .set('Authorization', authorization)
      .send({ activo: false })
      .expect(200);
    await server
      .post('/entregas')
      .set('Authorization', authorization)
      .send({
        clienteId: clienteArchivado.body.id,
        tipoMango: 'Tommy',
        calidad: 'PRIMERA',
        pesoKg: 1,
        precioPorKg: 1000,
        canastillasEntregadas: 0,
      })
      .expect(409);
    await server
      .post('/abonos')
      .set('Authorization', authorization)
      .send({ clienteId: clienteArchivado.body.id, montoPesos: 1 })
      .expect(409);
    await server
      .post('/devoluciones')
      .set('Authorization', authorization)
      .send({ clienteId: clienteArchivado.body.id, cantidad: 1 })
      .expect(409);

    const archivo = JSON.parse(readFileSync(archivoDatos, 'utf8')) as {
      usuarios: { usuario: string; contrasenaHash: string }[];
      clientes: { id: number }[];
    };
    expect(archivo.usuarios.some((u) => u.usuario === 'heredado')).toBe(true);
    expect(archivo.clientes.some((c) => c.id === 7)).toBe(true);
    expect(readFileSync(archivoDatos, 'utf8')).not.toContain(contraseñaA);
    copyFileSync(archivoDatos, `${archivoDatos}.bak`);
    writeFileSync(archivoDatos, '{ dañado');

    await app.close();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    app.getHttpServer().setMaxListeners(30);
    await request(app.getHttpServer())
      .get(`/clientes/${clienteA}/cuenta`)
      .set('Authorization', authorization)
      .expect(200);
    const nuevoCliente = await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', authorization)
      .send({ nombre: 'Productor después de reiniciar' })
      .expect(201);
    expect(nuevoCliente.body.id).toBeGreaterThan(clienteA);

    await app.close();
    const archivoDañado = '{ archivo principal dañado';
    const respaldoDañado = '{ respaldo dañado';
    writeFileSync(archivoDatos, archivoDañado);
    writeFileSync(`${archivoDatos}.bak`, respaldoDañado);
    const arranqueFallido = async () => {
      const moduloRoto = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const appRota = moduloRoto.createNestApplication();
      await appRota.init();
    };
    await expect(arranqueFallido()).rejects.toThrow(
      'El archivo de datos y su copia de respaldo no contienen datos válidos. No se modificó ningún archivo.',
    );
    expect(readFileSync(archivoDatos, 'utf8')).toBe(archivoDañado);
    expect(readFileSync(`${archivoDatos}.bak`, 'utf8')).toBe(respaldoDañado);
  });
});
