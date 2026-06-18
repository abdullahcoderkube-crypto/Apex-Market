const {Product, Reviews, User} = require('../models')

const getAllproducts = async (req, res) => {
    try{
        const {category, page, limit} = req.query;

        // for sorted by price along with specific category & pagination
        if (req.query.category && req.query.sortBy && req.query.page && req.query.limit) {
            const direction = req.query.sortBy === 'price_asc' ? 'ASC' : 'DESC'; // for sorting/order 
            const skip = (page - 1) * limit;
            const {count, rows} = await Product.findAndCountAll({where: {
                    isActive: true, 
                    categoryId: category
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
                    categoryId: category
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
            attributes: ['name', 'id', 'categoryId', 'price', 'image_urls', 'stock'],
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
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'name', 'description', 'price', 'image_urls', 'stock'],
            include: [
                {
                    model: Reviews,
                    as: 'reviews',
                    attributes: ['id', 'rating', 'comment', 'createdAt'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['name']
                        }
                    ]
                }
            ]
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found.'
            });
        }

        // Calculate average rating
        let avgRating = 0;
        if (product.reviews && product.reviews.length > 0) {
            const sum = product.reviews.reduce((acc, r) => acc + r.rating, 0);
            avgRating = parseFloat((sum / product.reviews.length).toFixed(1));
        }

        res.status(200).json({
            success: true,
            product: product,
            avgRating: avgRating
        })
    } catch(error) {
        console.error(error);
        res.status(500).json({
            success: false, 
            error: error.message || error
        })
    }
}

module.exports = { getAllproducts, getProductById};
