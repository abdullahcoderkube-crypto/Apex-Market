const {Product} = require('../models')
const {Op} = require('sequelize');

const getAllproducts = async (req, res) => {
    try{
        const {category, page, limit} = req.query;

        // for sorted by price along with specific category & pagination
        if (req.query.category && req.query.sortBy && req.query.page && req.query.limit) {
            const direction = req.query.sortBy === 'price_asc' ? 'ASC' : 'DESC'; // for sorting/order 
            const skip = (page - 1) * limit;
            const {count, rows} = await Product.findAndCountAll({where: {
                    isActive: true, 
                    categoryId: category,
                    stock: {
                        [Op.gt]: 0
                    }
                }, 
                    order: [['price', direction]], // sort by price - lowest to highest 
                    offset: skip, 
                    limit: limit 
            })

            const response = {
                metadata : {
                    totalItems: count,
                    totalPages: count / limit,
                    currentPage: page, 
                },
                products: rows
            }

            return res.status(200).json(response)
        }
        
        // for all products of specific category, along with pagination
        if (req.query.category && req.query.page && req.query.limit) {

            const skip = (page - 1) * limit;
            const {count, rows} = await Product.findAndCountAll({where: {
                    isActive: true, 
                    categoryId: category,
                    stock: {
                        [Op.gt]: 0
                    }
                }, 
                    offset: skip, 
                    limit: limit 
            })

            const response = {
                metadata : {
                    totalItems: count,
                    totalPages: count / limit,
                    currentPage: page, 
                },
                products: rows
            }

            return res.status(200).json(response);
        }

        // for All Products with all categories.
        const products = await Product.findAll({
            where: {
                isActive: true,
            }, 
            attributes: ['name', 'id', 'categoryId', 'price', 'image_urls', 'stock']
        })

        res.status(200).json({
            success: true,
            products: products // arr of objects
        })
    } catch(err) {
        console.error(err)
        res.status(500).json({
            success: false, 
            error: "Internal Server Error!"
        })
    }
}

const getProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId, {attributes:['name', 'description', 'price', 'image_urls']})
        res.status(200).json({
            success: true,
            product: product
        })
    } catch(error) {
        console.error(error);
        res.status(500).json({
            success: false, 
            error: error
        })
    }
}

module.exports = { getAllproducts, getProductById};
