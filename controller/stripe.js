const db = require('../DB/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const async = require("async");
const _ = require('underscore');
const configGlobal = require('../config/global');



/**
 *  Create Stripe Customer
 * @param {*} email 
 * @returns 
 */
exports.createStripeCustomer = (email) => {
	return stripe.customers.create({
	  email: email,
	});
	// TODO: Store this customer id in customer table
};

/**
 *  Create Subscriptions
 * @param {*} email 
 * @returns 
 */
exports.createSubscriptions = async (req, res) => {

	if (!(req.body && req.params.id)) {
		return res.status(400).send("User Id Must be required.");
	}

	if (!(req.body && req.params.productId)) {
		return res.status(400).send("Product Id Must be required.");
	}

	const conn = await db.getConnection();
	conn.query(`SELECT * FROM users WHERE (id=?)`, [req.params.id]).then(async data=>{
		if(!data || !data[0]) {
			conn.release();
			return res.status(404).send({error: "No user(s) found"});
		}

		const user = data[0]
		stripe.subscriptions.create({
			customer: user.stripe_customer_id,
			items: [{price: req.params.productId}],
		}, function(err, result){

			if (err) {
				if (err.raw && err.raw.message) {
					conn.release();
					return res.status(500).send({error: err.raw.message});
				}

				conn.release();
				return res.status(500).send({error: err});
			} else {
				conn.release();
				return res.status(200).send({data: result});
			}
		}).catch(err => {
			conn.release();
			return res.status(500).send({error: "Oops! Something went wrong please try again later"});
		})
	});
}


/**
 *  Create Subscriptions
 * @param {*} email 
 * @returns 
 */
exports.attachPaymentMethod = async (req, res) => {

	if (!req.params.paymentMethodId) {
		return res.status(400).send("Payment Method Id Must be required.");
	}

	const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

			// attach card detain in customer
			stripe.paymentMethods.attach(req.params.paymentMethodId, {
				customer: data[0].stripe_customer_id
			}, function(err, result) {

				if (err) {
					conn.release();
					return res.status(500).send({error: err, key: '1'});
				}

				stripe.customers.retrieve(data[0].stripe_customer_id, function(err, result){

					if (err) {
						conn.release();
						return res.status(500).send({error: err, key: '3'});
					}

					if (!(result && result.invoice_settings && result.invoice_settings.default_payment_method)) {

						// Update set as a default payment source
						stripe.customers.update(data[0].stripe_customer_id, {
							invoice_settings: {
								default_payment_method: req.params.paymentMethodId
							}
						}, function(err, result) {
							if (err) {
								conn.release();
								return res.status(500).send({error: err, key: '2'});
							}

							conn.release();
							return res.status(200).send( {data : data[0]});
						});

					} else {
						conn.release();
						return res.status(200).send({data: data[0]});
					}
				});
			});
        }
    });
}

/**
 *  cancel user subscription
 */
exports.cancelSubscriptions = function(req, res) {

	if (!(req.params && req.params.subscriptionId)) {
		return res.status(400).send("Subscription Id Must be required.");
	}

	stripe.subscriptions.del(req.params.subscriptionId, function(err, result) {
		if (err) {
			return res.status(500).send({error: err});
		}

		return res.status(200).send( {data : result});
	});
}

/**
 *  Get Paments Methos list
 * @param {*} userId 
 * @returns 
 */
exports.getUserPaymentMethods = async (req, res) => {
	if(!(req.user && req.user.id)) {
        return res.status(400).send("User Id must be required.");
    }

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	if (!data[0].stripe_customer_id) {
        		conn.release();
            	return res.status(419).send({error: "Stripe Customer Id must be required"});
        	}

        	stripe.customers.listPaymentMethods(data[0].stripe_customer_id, { type: 'card'}, function(err, result) {
        		if (err) {
					conn.release();
					return res.status(500).send({error: err});
				}

				conn.release();
				return res.status(200).send({data : result.data});
        	});
       	}
    });

}

/**
 *  Update user card billing infromation
 */
exports.updateBillingInformation = function(req, res) {

	if (!(req.params && req.params.paymentMethodId)) {
		return res.status(400).send("Payment Method Id Must be required.");
	} else if (!req.body.name) {
		return res.status(400).send("Name Must be required.");	
	} else if (!req.body.email) {
		return res.status(400).send("Email Must be required.");	
	} else if (!req.body.phone) {
		return res.status(400).send("Phone Must be required.");	
	} else if (!req.body.country) {
		return res.status(400).send("Country Must be required.");	
	} else {

		stripe.paymentMethods.update(req.params.paymentMethodId, {
		  	billing_details: {
		  		address: {
		  			city: req.body.city,
		  			country: req.body.country,
		  			line1: req.body.line1,
		  			line2: req.body.line2,
		  			postal_code: req.body.postal_code,
		  			state: req.body.state,
		  		},
		  		email: req.body.email,
		  		name: req.body.name,
		  		phone: req.body.phone,
		  	}
		}, function(err, result){
			if (err) {
				return res.status(500).send({error: err});
			}

			return res.status(200).send( {data : result});
		});
	}
}

/**
 *  Get user Subscription list 
 */
exports.getUserSubscriptions = async(req, res) => {
    
    if(!(req.user && req.user.id)) {
        return res.status(400).send("User Id must be required.");
    }

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	if (!data[0].stripe_customer_id) {
        		conn.release();
            	return res.status(419).send({error: "Stripe Customer Id must be required"});
        	}

        	stripe.subscriptions.list({
			  	customer: data[0].stripe_customer_id,
			}, function(err, result){
				if (err) {
					conn.release();
					return res.status(500).send({error: err});
				}

				conn.release();
				return res.status(200).send({data : result.data});
			});
        }
    }, err => {
        conn.release();
        return res.status(200).send({error: err});
    });
}


/**
 *  Get Admin Subscription list 
 */
exports.getAdminSubscriptions = async(req, res) => {
    
    if(!(req.params && req.params.id)) {
        return res.status(400).send("User Id must be required.");
    }

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.params.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	if (!data[0].stripe_customer_id) {
        		conn.release();
            	return res.status(419).send({error: "Stripe Customer Id must be required"});
        	}

        	stripe.subscriptions.list({
			  	customer: data[0].stripe_customer_id,
			}, function(err, result){
				if (err) {
					conn.release();
					return res.status(500).send({error: err});
				}

				conn.release();
				return res.status(200).send({data : result.data});
			});
        }
    }, err => {
        conn.release();
        return res.status(200).send({error: err});
    });
}


/**
 * Get admin all subscriptions 
 */
exports.getAdminAllSubscriptions = function (req, res) {
	stripe.subscriptions.list({}, function(err, result) {
		if (err) {
			return res.status(500).send({error: err});
		}

		return res.status(200).send({data : result.data});
	});
}

/**
 *  Get All Product list 
 */
exports.getAllProduct = function(req, res) {

    const getPrices = (cb) => {
    	stripe.prices.list({active: true}, function(err, result) {

			if (err) {
				cb(err);
				return;
			}

			return cb(null, result.data);
		});
    }

    const getProducts = (cb) => {
    	stripe.products.list({active: true}, function(err, result){
			if (err) {
				cb(err);
				return;
			}

			return cb(null, result.data);
		});
    }


	async.parallel([getPrices, getProducts], function done(err, results) {
        if (err) {
            return res.status(500).send({error: err});
        }
        
        let	groupByPrice;
        if (results && results[0] && results[0].length) {
        	groupByPrice = _.groupBy(results[0], 'product');
        }

	    var finalResponse = [];
		if (results && results[1] && results[1].length) {
			const pData = results[1];
			for (let j = 0; j < pData.length; j += 1) {
				finalResponse.push({
					"name": pData[j].name,
		            "priceId": groupByPrice[pData[j].id][0].id,
		            "id": pData[j].id,
				});
			}
		}

		return res.status(200).send( {data : finalResponse});
    });
}


/**
 *  ACH Create bank account
 */
exports.createBankAccount = async(req, res) => {


	if(!(req.user && req.user.id)) {
        return res.status(400).send("User Id must be required.");
    }

	if (!req.body.country) {
		return res.status(400).send("Country must be required.");
	} else if (typeof req.body.country !== 'string') {
		return res.status(400).send("Country must be string.");
	} else if (req.body.country.toLowerCase() !== 'us') {
		return res.status(400).send("Only US Country Allowed.");
	}else if (!req.body.currency) {
		return res.status(400).send("Currency must be required.");
	} else if (!req.body.account_number) {
		return res.status(400).send("Account number must be required.");
	} else {

		const conn = await db.getConnection();
	    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

	        if (!(data && data[0])) {
	        	conn.release();
	            return res.status(419).send({error: "Invalid User Id"});
	        } else {

	        	if (!data[0].stripe_customer_id) {
	        		conn.release();
	            	return res.status(419).send({error: "Stripe Customer Id must be required."});
	        	}

	        	stripe.tokens.create({
				  	bank_account: {
					    country: req.body.country,
					    currency: req.body.currency,
					    account_holder_name: req.body.account_holder_name,
					    account_holder_type: req.body.account_holder_type,
					    routing_number: req.body.routing_number,
					    account_number: ''+req.body.account_number,
				  	},
				}, function(err, result) {
					if (err) {
						return res.status(500).send({error: err});
					}

					stripe.customers.createSource(data[0].stripe_customer_id, {
						source: result.id
					}, function(err, result){
						if (err) {
							conn.release();
							return res.status(500).send({error: err});
						}

						conn.release();
						return res.status(200).send({data : result});
					});    	
				});
	       	}
	    }, err => {
	    	conn.release();
    		return res.status(200).send({error: err});
	    });
	}
}


/**
 *  ACH Verify bank account
 */
exports.verifyBankAccount = async(req, res) =>{

	if(!(req.user && req.user.id)) {
        return res.status(400).send("User Id must be required.");
    }

	if(!(req.params && req.params.sourceId)) {
        return res.status(400).send("Bank Source Id must be required.");
    }
    
    if(!parseInt(req.body.amount_one)) {
        return res.status(400).send("Invalid amount one");
    }

    if(!parseInt(req.body.amount_two)) {
        return res.status(400).send("Invalid amount two");
    }

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	if (!data[0].stripe_customer_id) {
        		conn.release();
            	return res.status(419).send({error: "Stripe Customer Id must be required."});
        	}

			stripe.customers.verifySource(data[0].stripe_customer_id, req.params.sourceId, {
				amounts: [parseInt(req.body.amount_one), parseInt(req.body.amount_two)]
			}, function(err, result){
				if (err) {
					conn.release();
					return res.status(500).send({error: err});
				}

				conn.release();
				return res.status(200).send({data : result});
			});	
       	}
    }, err => {
    	conn.release();
		return res.status(200).send({error: err});
    }); 
}


/**
 *  ACH Create Charges
 */
exports.createCharges = async(req, res) => {

	if(!(req.user && req.user.id)) {
        return res.status(400).send("User Id must be required.");
    }

	if(!(req.params && req.params.sourceId)) {
        return res.status(400).send("Bank Source Id must be required.");
    }

    if (!req.body.amount) {
    	return res.status(400).send("Amount must be required.");	
    }
	
	var currencyValue = +parseFloat(parseInt(req.body.amount)*0.001).toFixed(2);
    if (!currencyValue || currencyValue < 0.50) {
    	return res.status(400).send("Invalid amount");	
    }

    if (!req.body.currency) {
    	return res.status(400).send("Currency must be required.");	
    }

    if (typeof req.body.currency !== 'string') {
    	return res.status(400).send("Currency must be string.");	
    }

    if ((''+req.body.currency).length !== 3) {
    	return res.status(400).send("Currency always 3 letter required.");	
    }


    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	if (!data[0].stripe_customer_id) {
        		conn.release();
            	return res.status(419).send({error: "Stripe Customer Id must be required."});
        	}

			stripe.charges.create({
		        amount: parseFloat(req.body.amount),
		        currency: req.body.currency.toLowerCase(),
		        source: req.params.sourceId,
		        customer: data[0].stripe_customer_id,
		  		description: req.body.description
		    }, function(err, result) {
		    	if (err) {
		    		conn.release();
					return res.status(500).send({error: err});
				}

				conn.release();
				return res.status(200).send({data : result});
		    });
		}
	});
}

/**
 * Subscription Invitations
 */
exports.sendSubscriptionInvitations = async(req, res) => {

	if(!(req.params && req.params.id)) {
        return res.status(400).send("User Id must be required.");
    }

    if (!req.body.note) {
    	return res.status(400).send("Note must be required.");
    }

    conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.params.id]).then(data=> {

        if (!(data && data[0])) {
        	conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        } else {

        	configGlobal.sendEmail(data[0].email, 'User Invitation', 'user-invitation-email.html', {
                username: data[0].first_name +' '+ data[0].last_name,
                note: req.body.note,
                invitationLink: process.env.USER_INVITATION_LINK +'?userId='+data[0].id
            }, function(response) {

                if (!(response.status)) {
                    conn.release();
                    return res.status(500).send({error: response.error});
                }

                conn.release();
                return res.status(200).send({message: 'Your Invitation Email has been send successfully.'});
            });
        }
    });

}