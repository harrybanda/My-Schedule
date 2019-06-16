const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const broadcast = require('./broadcast');

const verifyAndDecode = auth => {
  const bearerPrefix = 'Bearer ';
  if (!auth.startsWith(bearerPrefix)) return { err: 'Invalid authorization header' };
  try {
    const token = auth.substring(bearerPrefix.length);
    const secret = process.env.secret;
    return jwt.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256'] });
  } catch (err) {
    return { err: 'Invalid JWT' };
  }
};

const getChannelData = async channelID => {
  const params = {
    TableName: 'TwitchMySchedule',
    Key: { channel: channelID }
  };

  const channelData = await documentClient.get(params).promise();

  if (channelData.Item) return channelData.Item;

  const newEntry = {
    TableName: 'TwitchMySchedule',
    Item: {
      channel: channelID,
      color: 'hsla(1, 60%, 50%, 1)',
      events: [],
      userCooldowns: [],
      channelCooldown: 0
    }
  };

  await documentClient.put(newEntry).promise();
  return newEntry.Item;
};

const userIsInCooldown = (channelData, opaqueUserId) => {
  const cooldown = channelData.userCooldowns.find(item => item.user === opaqueUserId);
  return cooldown && cooldown.timestamp > Date.now();
};

const channelIsInCooldown = channelData => {
  return channelData.channelCooldown < Date.now();
};

const updateChannelData = async (channelData, opaqueUserId) => {
  const userCooldownMs = 1000;
  const channelCooldownMs = 1000;

  // clear expired userCooldowns, add new cooldown for user, set new channel cooldown
  channelData.userCooldowns.filter(item => item.timestamp > Date.now() && item.user !== opaqueUserId);
  channelData.userCooldowns.push({ user: opaqueUserId, timestamp: Date.now() + userCooldownMs });

  // Update database
  const params = {
    TableName: 'TwitchMySchedule',
    Key: {
      channel: channelData.channel
    },
    UpdateExpression: 'set userCooldowns = :ucd, channelCooldown = :ccd, events = :e, color = :c',
    ExpressionAttributeValues: {
        ':ucd': channelData.userCooldowns,
        ':ccd': Date.now() + channelCooldownMs,
        ':e': channelData.events,
        ':c': channelData.color
    }
  };

  return documentClient.update(params).promise();
};


exports.handler = async event => {
  // Response function
  const response = (statusCode, body) => {
    const headers = {
      ['Access-Control-Allow-Origin']: event.headers.origin
    };

    return { statusCode, body: JSON.stringify(body, null, 2), headers };
  };

  // Verify all requests.
  const payload = verifyAndDecode(event.headers.Authorization);

  // Return error if verification failed.
  if (payload.err) return response(401, JSON.stringify(payload));

  // Get channel data from database, if no entry is found create one.
  const channelData = await getChannelData(payload.channel_id);
  if (!channelData) return response(500, 'Internal Server Error');

  // Bot abuse prevention: Limit user from too frequent requests, and prevent a single channel for broadcasting too many changes
  const cooldownCheck = userIsInCooldown(channelData, payload.opaque_user_id) && channelIsInCooldown(channelData);
  if (cooldownCheck) return response(429, 'Too Many Requests');

  
  if (event.path === '/crud/delete') {
    var id = event.body;
    channelData.events.splice(id, 1);
  } else if (event.path === '/crud/update') {
    var id = JSON.parse(event.body).id;
    var name = JSON.parse(event.body).name;
    var date = JSON.parse(event.body).date;
    var start = JSON.parse(event.body).start;
    var end = JSON.parse(event.body).end;
    
    channelData.events[id].name = name; 
    channelData.events[id].date = date; 
    channelData.events[id].start = start; 
    channelData.events[id].end = end; 
    
  } else if (event.path === '/crud/add') {
      channelData.events.push(JSON.parse(event.body));
      
  } else if (event.path === '/crud/color') {
      channelData.color = event.body;
  }
  
  channelData.events.sort(function(a, b) {
    return  +new Date(a.date) - +new Date(b.date);
  });
  
  var res = {
    events: channelData.events, 
    color: channelData.color
  }
    
  return Promise.all([
    updateChannelData(channelData, payload.opaque_user_id), 
    broadcast(channelData)])
    .then(() => response(200, res))
    .catch(err => {
      console.warn(err);
      response(500, 'Internal Server Error');
    });
};