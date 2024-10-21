const express = require('express');
const cors = require('cors'); // Importa el paquete cors
const mysql = require('mysql2/promise');

const app = express();
app.use(cors()); // Usa el middleware de cors
app.use(express.json());

// Crear conexión a la base de datos
const createPool = () => {
    return mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: 'mazoku1?',
        database: 'restaurante'
    });
};

// Ruta para obtener clientes
app.get('/clientes', async (req, res) => {
    const conexion = createPool();
    try {
        const [filas] = await conexion.query('SELECT * FROM clientes');
        res.json(filas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    } finally {
        await conexion.end();
    }
});

// Ruta para crear un cliente
app.post('/clientes', async (req, res) => {
    const { nombre, email } = req.body;
    const conexion = createPool();
    try {
        const [resultado] = await conexion.query('INSERT INTO clientes (nombre, email) VALUES (?, ?)', [nombre, email]);
        res.status(201).json({ id: resultado.insertId, nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el cliente' });
    } finally {
        await conexion.end();
    }
});

// Ruta para obtener el menú
app.get('/menu', async (req, res) => {
    const conexion = createPool();
    try {
        const [filas] = await conexion.query('SELECT * FROM menu_items');
        res.json(filas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el menú' });
    } finally {
        await conexion.end();
    }
});

// Ruta para crear un pedido
app.post('/pedidos', async (req, res) => {
    const { clienteId, items } = req.body;
    let montoTotal = 0;

    const conexion = createPool();
    const connection = await conexion.getConnection();

    try {
        // Iniciar una transacción
        await connection.beginTransaction();

        // Insertar el pedido
        const [resultadoPedido] = await connection.query('INSERT INTO pedidos (cliente_id, monto_total) VALUES (?, ?)', [clienteId, montoTotal]);
        const idPedido = resultadoPedido.insertId;

        // Insertar los artículos del pedido
        for (const item of items) {
            const [resultadoItem] = await connection.query('INSERT INTO items_pedido (pedido_id, menu_item_id, cantidad) VALUES (?, ?, ?)', [idPedido, item.id, item.cantidad]);
            montoTotal += item.precio * item.cantidad;
        }

        // Actualizar el monto total del pedido
        await connection.query('UPDATE pedidos SET monto_total = ? WHERE id = ?', [montoTotal, idPedido]);

        // Confirmar la transacción
        await connection.commit();

        res.status(201).json({ id: idPedido, montoTotal });
    } catch (err) {
        // Revertir la transacción en caso de error
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al procesar el pedido' });
    } finally {
        connection.release();
    }
});

app.listen(3000, () => {
    console.log('Servidor iniciado en el puerto 3000');
});
