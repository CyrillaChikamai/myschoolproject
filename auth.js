const express = require('express')

/**
 * Json Web Token
 * JWTs are used to validate users
*/
const jwt = require('jsonwebtoken');

/**
 * this will be the name of our JWTs
 * when a client successfully logs in, we give them a token with this name, then we'll check for it
 *  after each request
*/
const jwtHeaderKey = 'auth_header';

/*
    This random string is our secret. We use it to generate json web tokens that we'll use to authenticate users
*/
const authSecret = 'e38a7f8f-6b3e-49ae-8695-0126d53947ed';
/*
  We'll use this algorithm for on the JSON Web Tokens(JWTs)
*/
const jwtAlgorithm = "HS256";


/**
 * 
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {function} next 
 */
function verifyUser(req, res, next){
  try {
    const jwtHeader = req.cookies[jwtHeaderKey]
    const jwtPayload = jwt.decode(jwtHeader)

    // console.log('jwtPayload', jwtPayload)
    req.userInfo = {
      ...jwtPayload.user
    }
    
    next()
  } catch (err) {
    // console.log()
    res.status(401)
  }
}

const user_path_map = new Map()

function once(req, res, next){
  try {
    const path = req.path
    const user_id = req.userInfo.id
    
    const rec_path = user_path_map.get(user_id)

    if(rec_path !== undefined){
      throw new Error('Request rate limit exceeded')
    }
    user_path_map.set(user_id, path)

    setTimeout(()=>{
      user_path_map.delete(user_id)
    }, 2000)

    next()
  } catch (err) {
    console.error(err)
    res.status(200).send()

    return
  }
}


module.exports = {
    jwt,
    jwtHeaderKey,
    jwtAlgorithm,
    authSecret,
    verifyUser,
    once
}