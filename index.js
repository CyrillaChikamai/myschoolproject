//import our HTTP framework
const express = require('express')

//require works similarly to import
/**For parsing incoming HTTP POST requests into Javascript objects */
const body_parser = require('body-parser')
/**For parsing incoming cookies in HTTP requests into Javascript objects */
const cookie_parser = require('cookie-parser')
//import functions and objects used to interface with our database
const DB = require('./database').DB
//Database connection pool
const pool = DB.pool

var ElasticEmail = require('@elasticemail/elasticemail-client')
var defaultClient = ElasticEmail.ApiClient.instance;
var apikey = defaultClient.authentications['apikey'];
apikey.apiKey = "8460AC6E3EEE4A9859DBACC1DCB1C4FECECB9B89E8A363BCAA9D9DEAE583867408A43C9532F0A4A2D4E179B6489D9D53"

let emailApi = new ElasticEmail.EmailsApi()





//this will be used to add JSON Web Tokens to the user's cookies.
// JWT --> JSON Web Token
// The JWTs will be used to identify users
const jwt = require('jsonwebtoken')
//objects to be used by our JWT library
const {authSecret, jwtAlgorithm, jwtHeaderKey, verifyUser, once} = require('./auth')


//construct our HTTP server
const app = express()
//this port number will be used by the server
const PORT = 5000

//initialize body_parser. converts the HTTP request body, which is a string, to a JSON object, which we can work with in Javascript
app.use(body_parser.json());
app.use(body_parser.urlencoded({
  extended:true
}))
//initialize cookie_parser. converts the HTTP request cookies, which are strings, to a JSON objects, which we can work with in Javascript
app.use(cookie_parser());


//serve HTML files inside the static folder
app.use(express.static('public'))

//HTTP endpoints to redirect users to the html pages in the public folder
app.get('/', function(req, res){
  res.redirect('/index.html')
})
app.get('/signin', function(req, res){
  res.redirect('/signin.html')
})
app.get('/signout', function(req, res){
  res.redirect('/signout.html')
})
app.get('/signup', function(req, res){
  res.redirect('/signup.html')
})
app.get('/my_account', function(req,res){
  res.redirect('/my_account.html')
})

//HTTP POST handler for signup
//this will handle HTTP POST requests on the endpoint /signup
// [TODO] modify to use any phone number format
app.post('/signup', async function(req, res){
  try {
    const {first_name, last_name, email, password} = req.body
    const emailExists = await DB.emailExists(pool, email)
    if(emailExists === true){
      res.status(400).send("Email already exists.")
      return
    }

    await DB.signUp(pool, first_name, last_name, email, password)

    res.status(200).send('Ok')
  } catch (err) {
    console.error(err)
    res.status(400).send()
  }
})


//user login
//this will handle HTTP POST requests on the endpoint /signin
// [TODO] modify to use any phone number format
app.post("/login", async function(req, res){
  try {
    const {email, password} = req.body
    const result = await pool.query('select * from users where email = $1 and password = $2', [email, password])
    if(result.rowCount === 0){
      res.status(400).send('Invalid login credentials or user not found.')
      return
    }

    const user = result.rows[0]
    //12 hours in milliseconds
    const sessionDuration = 12 * 60 * 60 * 1000;
    const token = jwt.sign({
      user:{
        ...user,
        password:'set',
        reminders_html:''
      }
    }, authSecret, {
      algorithm: jwtAlgorithm,
      expiresIn: sessionDuration
    });
    const session_timeout = new Date().getTime() + sessionDuration

    
    res.status(200).cookie(jwtHeaderKey, token, {maxAge:sessionDuration}).send({
      ...user,
      password:'set',
      session_timeout,
    })
  } catch (err) {
    console.error(err)
    res.status(400).send()
  }
})

app.get('/logout', function(req, res){
  res.clearCookie(jwtHeaderKey).send();
})


app.get('/get_items', async function(req, res){
  try {
    const items = await DB.getItems(pool)
    res.send(items)
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})


app.post('/add_inventory_items', verifyUser, once, async function(req, res){
  try {
    const user_id = req.userInfo.id

    // console.log(user_id)

    const {item_id, item_qty, exp_date, mfg_date, batch_id} = req.body
    const date_added = new Date().toISOString()
    
    await DB.addInventoryItem(pool, user_id, item_id, date_added, exp_date, item_qty, batch_id, mfg_date)
    
    res.send('')
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

app.get('/my_inventory_items', verifyUser, async function(req, res){
  try {
    const user_id = req.userInfo.id
    
    const items = await DB.getInventoryItems(pool, user_id)
    // console.log(items)
    res.send(items)
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

app.post('/delete_inventory_item', verifyUser, async function(req, res){
  try {
    const user_id = req.userInfo.id
    const {inventory_item_id} = req.body

    await DB.deleteInventoryItem(pool, inventory_item_id, user_id)
    res.status(200).send()
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

app.post('/sell_inventory_item', verifyUser, once, async function(req, res){
  try {
    const user_id = req.userInfo.id
    const {item_id} = req.body
    const date_now = new Date()

    await DB.sellInventoryItem(pool, user_id, date_now, item_id)
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

app.post('/update_batch_size', verifyUser, once, async function(req, res){
  try {
    const {new_batch_size, item_id} = req.body
    const user_id = req.userInfo.id

    await DB.updateItemBatchSize(pool, user_id, item_id, new_batch_size)

    res.status(200).send()
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

app.get('/my_exp_reminders_html', verifyUser, async function(req, res){
  try {
    const reminders_html = await DB.getUserRemindersHtml(pool, req.userInfo.id)
    // console.log(reminders_html)
    res.send(reminders_html)
  } catch (err) {
    console.error(err)
    res.status(500).send()
  }
})

var emailAPICallback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('Email API called successfully.');
  }
};

let Items = []
async function loadItems(){
  try {
    const result =await  pool.query('select * from item')
    Items = result.rows
  } catch (err) {
    console.error('Error loading Items from db')
  }
}
loadItems()

function getItemCategory(item_id){
  for(const Item of Items){
    if(item_id === Item.id){
      return Item.category
    }
  }
  return ''
}

function getItemManufacturer(item_id){
  for(const Item of Items){
    if(item_id === Item.id){
      return Item.manufacturer
    }
  }
  return ''
}

function daysRemaining(time_now, exp_ts){
  const days =  Math.floor((exp_ts - time_now) / (86_400_000))
  return days
}

function daysToNextBatchExp(Items){
  for(let i  = 0; i < Items.length - 1; i++){
    Items[i].days_to_next_expiry = ''
    if(Items[i].item_id === Items[i+1].item_id){
      Items[i].days_to_next_expiry = daysRemaining(new Date(Items[i].ExpDate).getTime(), new Date(Items[i+1].ExpDate).getTime())
    }
  }
}

let last_emails_send_time = null

function timeToSendEmails(){
  if(last_emails_send_time === null){
    return true
  }
  if(new Date().getTime() > last_emails_send_time + 86400 * 1000){
    return true
  }
  return false
}

async function SendReminders(weekly_item_reminders, monthly_item_reminders){
  function getItemTableRows(reminders){
    try {
      var rows = ''
      for(const reminder of reminders){
        rows += `<tr key="${reminder.inventory_item_id}">
          <td>${reminder.ItemName}</td>
          <td>${reminder.item_category}</td>
          <td>${getItemManufacturer(reminder.item_id)}</td>
          <td>${reminder.batch_id}</td>
          <td>${reminder.batch_size}</td>
          <td>${reminder.MfgDate}</td>
          <td>${reminder.ExpDate}</td>
          <td>${reminder.days_to_next_expiry?reminder.days_to_next_expiry:'N/A'}</td>
        </tr>`
      }

      return rows
    } catch (err) {
      return 'None'
    }
  }
  
  const user_ids_set = new Set()

  for(const reminder of weekly_item_reminders){
    user_ids_set.add(reminder.owner)
  }
  for(const reminder of monthly_item_reminders){
    user_ids_set.add(reminder.owner)
  }

  for(const user_id of user_ids_set){
    const user_email = await DB.getUserEmail(pool, user_id)
    const user_weekly_reminders = []
    const user_monthly_reminders = []
    
    for(const WeeklyReminder of weekly_item_reminders){
      if(WeeklyReminder.owner === user_id){
        user_weekly_reminders.push(WeeklyReminder)
      }
    }
    daysToNextBatchExp(user_weekly_reminders)
    
    for(const MonthlyReminder of monthly_item_reminders){
      if(MonthlyReminder.owner === user_id){
        user_monthly_reminders.push(MonthlyReminder)
      }
    }
    daysToNextBatchExp(user_monthly_reminders)

    const emailHTML = `
    <html>
      <head>
        <style>
          table{
            border: 1px solid #bbb;
            padding: 0.5rem;
            text-align: left;
          }

          th{
            color:rgb(44, 155, 10);
            padding: 0.25rem;
          }

          caption{
            font-size: 1.5rem;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="table0">
          <table border="1">
            <thead>
              <caption>Expire in one week</caption>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Batch Id</th>
                <th>Batch Size</th>
                <th>Mfg Date</th>
                <th>Expiry Date</th>
                <th>Days Remaining(to next batch expiry)</th>
              </tr>
            </thead>
            <tbody>
              ${getItemTableRows(weekly_item_reminders)}
            </tbody>
          </table>
          <table border="1">
            <thead>
              <caption>Expire in one month</caption>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Batch Id</th>
                <th>Batch Size</th>
                <th>Mfg Date</th>
                <th>Expiry Date</th>
                <th>Days Remaining(to next batch expiry)</th>
              </tr>
            </thead>
            <tbody>
              ${getItemTableRows(monthly_item_reminders)}
            </tbody>
          </table>
        </div>
      </body>
    </html>
    `

    await DB.saveUserRemindersHtml(pool, user_id, emailHTML)
    let email = ElasticEmail.EmailMessageData.constructFromObject({
      Recipients: [
        new ElasticEmail.EmailRecipient(user_email)
      ],
      Content: {
        Body: [
          ElasticEmail.BodyPart.constructFromObject({
            ContentType: "HTML",
            Content: emailHTML
          })
        ],
        Subject: "Inventory Expiry Reminders",
        From: "eugenetaban316@gmail.com "
      }
    });
    // console.log(emailHTML)
    if(timeToSendEmails()){
      emailApi.emailsPost(email, emailAPICallback)
      console.log('sending emails')
      last_emails_send_time = new Date().getTime()
    }
  }
}

async function ItemAlerts(){
  try {
    const InvItems = await DB.getAllUnsoldItems(pool)

    const one_month_from_now = new Date().getTime() + (86400 * 1000 * 30)
    const one_week_from_now  = new Date().getTime() + (86400 * 1000 * 7)

    const monthly_item_reminders = []
    const weekly_item_reminders = []

    for(const Item of InvItems){
      const item_exp_ts = new Date(Item.exp_date).getTime()
      
      if(item_exp_ts < one_week_from_now && item_exp_ts > new Date().getTime()){
        // send item expiry week reminder and update database
        const ItemName = await DB.getItemName(pool, Item.item_id)
        weekly_item_reminders.push({
          item_id: Item.item_id,
          owner: Item.owner,
          inventory_item_id: Item.id,
          ItemName,
          item_category: getItemCategory(Item.item_id),
          batch_id: Item.batch_id,
          batch_size: Item.batch_size,
          ExpDate: `${new String(new Date(item_exp_ts)).substring(0, 15)}`,
          MfgDate: `${new String(new Date(Item.mfg_date)).substring(0, 15)}`,
          item_exp_ts,
          days_to_next_expiry:'-'
        })
      }

      if(item_exp_ts < one_month_from_now && item_exp_ts > new Date().getTime()){
        // send item expiry month reminder and update database
        const ItemName = await DB.getItemName(pool, Item.item_id)
        
        monthly_item_reminders.push({
          item_id: Item.item_id,
          owner: Item.owner,
          inventory_item_id: Item.id,
          item_category: getItemCategory(Item.item_id),
          ItemName,
          batch_id: Item.batch_id,
          batch_size: Item.batch_size,
          ExpDate: `${new String(new Date(item_exp_ts)).substring(0, 15)}`,
          MfgDate: `${new String(new Date(Item.mfg_date)).substring(0, 15)}`,
          item_exp_ts,
          days_to_next_expiry:'-'
        })
      }
    }
    await SendReminders(weekly_item_reminders, monthly_item_reminders)
  } catch (err) {
    console.error(err)
  }
}
setTimeout(()=>{
  setInterval(ItemAlerts, 30_000)
}, 6000)
setTimeout(ItemAlerts, 6000)

app.listen(PORT, function(){
  console.log(`Server running on port ${PORT}`)
})