const express = require('express');
const router = express.Router();
const path = require('path')

const { isLoggedIn } = require('../helpers/util')

module.exports = (db) => {
    // GET & VIEW DATA
    router.get('/', isLoggedIn, async (req, res, next) => {
        try {
            let sql = 'SELECT goods.barcode, goods.name, goods.stock, goods.purchaseprice, goods.sellingprice, units.unit, goods.picture FROM public."goods" JOIN public."units" ON goods.unit = units.unit'

            const result = await db.query(sql)

            res.render('utilitiesPages/good/list', { user: req.session.user, data: result.rows, query: req.query, currentPage: 'POS - Goods' });
        } catch (err) {
            console.log(err)
            res.send(err)
        }
    });

    router.get('/datatable', async (req, res) => {
        let params = []

        if (req.query.search.value) {
            params.push(`barcode ilike '%${req.query.search.value}%'`)
        }
        if (req.query.search.value) {
            params.push(`name ilike '%${req.query.search.value}%'`)
        }
        if (req.query.search.value) {
            params.push(`unit ilike '%${req.query.search.value}%'`)
        }

        const limit = req.query.length
        const offset = req.query.start
        const sortBy = req.query.columns[req.query.order[0].column].data
        const sortMode = req.query.order[0].dir

        const total = await db.query(`select count(*) as total from public."goods"${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
        const data = await db.query(`select * from public."goods"${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
        const response = {
            "draw": Number(req.query.draw),
            "recordsTotal": total.rows[0].total,
            "recordsFiltered": total.rows[0].total,
            "data": data.rows
        }
        res.json(response)
    })

    // ADD DATA
    router.get('/add', isLoggedIn, async (req, res, next) => {
        const data = await db.query('SELECT * FROM public."goods"')

        res.render('utilitiesPages/good/add', { user: req.session.user, data: data.rows, currentPage: 'POS - Goods' });
    });

    router.post('/add', isLoggedIn, async (req, res, next) => {
        try {
            let picture;
            let uploadPath;

            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }

            // The name of the input field (i.e. "picture") is used to retrieve the uploaded file
            picture = req.files.picture;
            const imagefiles = `${Date.now()}-${picture.name}`
            uploadPath = path.join(__dirname, '..', 'public', 'images', 'upload', imagefiles);

            // Use the mv() method to place the file somewhere on your server
            picture.mv(uploadPath)

            const { barcode, name, stock, purchaseprice, sellingprice, unit } = req.body
            const { rows: goods } = await db.query('SELECT * FROM public."goods" WHERE barcode = $1', [barcode])
            if (goods.length > 0) {
                req.flash('error', 'Product already exist!')
                return res.redirect('/add')
            }

            await db.query('INSERT INTO public."goods" (barcode, name, stock, purchaseprice, sellingprice, unit, picture) VALUES ($1, $2, $3, $4, $5, $6, $7)', [barcode, name, stock, purchaseprice, sellingprice, unit, imagefiles])

            res.redirect('/goods')
        } catch (error) {
            res.send(error)
        }
    })

    // EDIT DATA
    router.get('/edit/:barcode', isLoggedIn, async (req, res, next) => {
        const { barcode } = req.params

        const { rows: data } = await db.query('SELECT * FROM public."goods" WHERE barcode = $1', [barcode])

        res.render('utilitiesPages/good/edit', { user: req.session.user, item: data[0], currentPage: 'POS - Goods' });
    });

    router.post('/edit/:barcode', isLoggedIn, async (req, res, next) => {
        try {
            let picture;
            let uploadPath;

            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }

            // The name of the input field (i.e. "picture") is used to retrieve the uploaded file
            picture = req.files.picture;
            const imagesfiles = `${Date.now()}-${picture.name}`
            uploadPath = path.join(__dirname, '..', 'public', 'images', 'upload', imagesfiles);

            // Use the mv() method to place the file somewhere on your server
            picture.mv(uploadPath, function (err) {
                if (err)
                    return res.status(500).send(err);

                const { barcode } = req.params
                const { name, stock, purchaseprice, sellingprice, unit } = req.body

                db.query('UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5, picture = $6 WHERE barcode = $7', [name, stock, purchaseprice, sellingprice, unit, imagesfiles, barcode])
                if (err) {
                    console.log(err)
                    return console.error(err.message);
                }
                res.redirect('/goods')
            })
        } catch (err) {
            console.log(err)
        }
    })

    // DELETE DATA
    router.get('/delete/:barcode', isLoggedIn, async (req, res, next) => {
        try {
            await db.query('DELETE FROM public."goods" WHERE barcode = $1', [req.params.barcode])

            res.redirect('/goods');
        } catch (err) {
            console.log(err)
            res.send(err)
        }
    });
    return router;
}
