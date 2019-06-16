const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });
const jwt = require("jsonwebtoken");

const verifyAndDecode = auth => {
  const bearerPrefix = "Bearer ";
  if (!auth.startsWith(bearerPrefix))
    return { err: "Invalid authorization header" };
  try {
    const token = auth.substring(bearerPrefix.length);
    const secret = process.env.secret;
    return jwt.verify(token, Buffer.from(secret, "base64"), {
      algorithms: ["HS256"]
    });
  } catch (err) {
    return { err: "Invalid JWT" };
  }
};

const getChannelData = async channelID => {
  const params = {
    TableName: "TwitchMySchedule",
    Key: { channel: channelID }
  };

  const channelData = await documentClient.get(params).promise();

  if (channelData.Item) return channelData.Item;

  const newEntry = {
    TableName: "TwitchMySchedule",
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

exports.handler = async event => {
  const response = (statusCode, body) => {
    const headers = {
      ["Access-Control-Allow-Origin"]: event.headers.origin
    };
    return { statusCode, body: JSON.stringify(body, null, 2), headers };
  };
  const payload = verifyAndDecode(event.headers.Authorization);

  if (payload.err) return response(401, JSON.stringify(payload));

  const channelData = await getChannelData(payload.channel_id);
  if (!channelData) return response(500, "Internal Server Error");
  
  var res = {
    events: channelData.events, 
    color: channelData.color
  }

  return response(200, res);
};
