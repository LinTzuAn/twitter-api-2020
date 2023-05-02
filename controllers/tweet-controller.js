const tweetServices = require('../service/tweet-service')

const tweetController = {
  // 新增推文
  postTweet: (req, res, next) => {
    tweetServices.postTweet(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 取得所有推文
  getTweets: (req, res, next) => {
    tweetServices.getTweets(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 取得單一推文
  getTweet: (req, res, next) => {
    tweetServices.getTweet(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 新增回覆
  postReply: (req, res, next) => {
    tweetServices.postReply(req, (err, data) => err ? next(err) : res.status(200).json(data))
  },
  // 取得某推文的回覆
  getReply: (req, res, next) => {
    tweetServices.getReply(req, (err, data) => err ? next(err) : res.status(200).json(data))
  }
}

module.exports = tweetController
