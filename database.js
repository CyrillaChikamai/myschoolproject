//Pool -> connection pool to our database
const Pool = require('pg').Pool

//initialize our Pool object
const pool = new Pool({
  database:'pharma',
  host:'localhost',
  port:'3842',
  password:'CHIKS',
  user:'postgres'
})

/**
 * Checks if a user has registered with a certain phone number. Used to avoid duplicate phone numbers among users
 * @param  {Pool}    _pool 
 * @param  {String}  email 
 * @return {Boolean} success
 */
async function emailExists(_pool, email){
  const res = await _pool.query("select id from users where email = $1",[email]);
  if(res.rowCount > 0){
      return true
  }
  return false
}

/**
* Function to add the user to the database after signing up
* @param {Pool} _pool 
* @param {String} first_name 
* @param {String} last_name 
* @param {String} email 
* @param {String} password 
*/
async function signUp(_pool, first_name, last_name, email, password){
  try {
      const res = await _pool.query('insert into users(first_name, last_name, email, password) values($1, $2, $3, $4)',
          [first_name, last_name, email, password])
  } catch (err) {
      throw new Error(err)
  }
}


/**
 * 
 * @param {Pool} _pool 
 */
async function getItems(_pool){
  try{
    const result = await  _pool.query('select * from Item')
    return result.rows
  }catch(err){
    throw new Error(err)
  }
}


async function addInventoryItem(_pool, user_id, item_id, date_added, exp_date, item_qty, batch_id, mfg_date){
  try{
     await  _pool.query('insert into Inventory(owner, item_id, date_added, exp_date, date_sold, batch_size, batch_id, mfg_date) values($1, $2, $3, $4, $5, $6, $7, $8)',
     [user_id, item_id, date_added, exp_date, null, item_qty, batch_id, mfg_date])
  }catch(err){
    throw new Error(err)
  }
}

async function getInventoryItems(_pool, user_id){
  try {
    const result = await _pool.query('select * from Inventory where owner = $1 order by id desc', [user_id])
    return result.rows
  } catch (err) {
    throw new Error(err)
  }
}

async function deleteInventoryItem(_pool, inventory_item_id, user_id){
  try {
    await _pool.query('delete from Inventory where id = $1 and owner = $2', [inventory_item_id, user_id])
  } catch (err) {
    throw new Error(err)
  }
}

async function sellInventoryItem(_pool, user_id, date_sold, item_id){
  try {
    const oldest_item_result = await _pool.query('select id from Inventory where date_sold is null and owner = $1 and item_id = $2 limit 1', [user_id, item_id])
    const oldest_item_id = oldest_item_result.rows[0].id
    
    await _pool.query(`update Inventory set date_sold = $1 where id = $2`, [date_sold, oldest_item_id])
  } catch (err) {
    throw new Error(err)
  }
}

async function getAllUnsoldItems(_pool){
  try {
    const res = await _pool.query('select * from inventory order by item_id, exp_date asc')

    return res.rows
  } catch (err) {
    throw new Error(err)
  }
}

async function getItemName(_pool, item_id){
  try {
    const res = await _pool.query('select name from Item where id = $1', [item_id])
    return res.rows[0].name
  } catch (err) {
    throw new Error(err)
  }
}

async function getUserEmail(_pool, user_id){
  try {
    const res = await _pool.query('select email from Users where id = $1', [user_id])
    return res.rows[0].email
  } catch (err) {
    throw new Error(err)
  }
}

async function updateItemBatchSize(_pool, user_id, item_id, new_batch_size){
  try {
    await _pool.query('update inventory set batch_size = $1 where owner = $2 and id = $3', [new_batch_size, user_id, item_id])
  } catch (err) {
    throw new Error(err)
  }
}

async function saveUserRemindersHtml(_pool, user_id, reminders_html){
  try {
    console.log('saving reminders...')
    await _pool.query('update users set reminders_html = $1 where id = $2', [reminders_html, user_id])
  } catch (err) {
    throw new Error(err)
  }
}

async function getUserRemindersHtml(_pool, user_id){
  try {
    const res = await _pool.query('select reminders_html from users where id = $1', [user_id])

    return res.rows[0].reminders_html
  } catch (err) {
    throw new Error(err)
  }
}

//keep all database functions and objects in this object called DB for easier reference inside other Javascript files
const DB = {
  pool,
  emailExists,
  signUp,
  getItems,
  addInventoryItem,
  getInventoryItems,
  deleteInventoryItem,
  sellInventoryItem,
  getAllUnsoldItems,
  getItemName,
  getUserEmail,
  updateItemBatchSize,
  saveUserRemindersHtml,
  getUserRemindersHtml
}

module.exports = {DB}