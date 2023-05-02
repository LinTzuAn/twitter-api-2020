const { Like, Reply, Tweet, User, sequelize } = require('../models')
const { getUser } = require('../_helpers')

const tweetServices = {
  // 新增推文
  postTweet: async (req, cb) => {
    try {
      const { description } = req.body
      const user = await User.findByPk(getUser(req).dataValues.id)
      if (!user) throw new Error('Can not find this user.')
      const tweet = await Tweet.create({
        UserId: user.id,
        description
      })
      cb(null, { success: true, tweet })
    } catch (err) {
      cb(err)
    }
  },
  // 取得所有推文
  getTweets: async (req, cb) => {
    try {
      const currentUser = getUser(req).id || 1
      const tweets = await Tweet.findAll({
        attributes: [
          'id',
          'description',
          'createdAt',
          'updatedAt',
          [sequelize.literal(`( SELECT COUNT(*) FROM Replies WHERE tweet_id = Tweet.id)`), 'repliesCount'],
          [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE tweet_id = Tweet.id)`), 'likesCount'],
          [sequelize.literal(`( SELECT COUNT(*) FROM Likes WHERE tweet_id = Tweet.id AND user_id = ${currentUser})`), 'currentUserLikes']
        ],
        include: [
          { model: User, attributes: ['id', 'account', 'name', 'avatar'] }
        ],
        order: [
          ['createdAt', 'DESC']
        ]
      })
      cb(null, tweets)
    } catch (err) {
      cb(err)
    }
  },
  // 取得單一推文
  getTweet: async (req, cb) => {
    try {
      const currentUser = getUser(req).id || 1
      const tweet = await Tweet.findByPk(req.params.id, {
        attributes: [
          'id',
          'description',
          'createdAt',
          'updatedAt',
          [sequelize.literal(`( SELECT COUNT(tweet_id) FROM Replies WHERE tweet_id = Tweet.id)`), 'repliesCount'],
          [sequelize.literal(`( SELECT COUNT(tweet_id) FROM Likes WHERE tweet_id = Tweet.id)`), 'likesCount'],
          [sequelize.literal(`( SELECT COUNT(user_id) FROM Likes WHERE tweet_id = Tweet.id AND user_id = ${currentUser})`), 'currentUserLikes']
        ],
        include: [
          { model: User, attributes: ['id', 'avatar', 'name', 'account'] },
          { model: Reply, include: { model: User, attributes: ['id', 'avatar', 'name', 'account'] } },
          { model: Like, attributes: ['id'] }
        ],
        order: [
          [{ model: Reply }, 'createdAt', 'DESC']
        ]
      })
      if (!tweet) throw new Error('推文不存在')
      cb(null, tweet)
    } catch (err) {
      cb(err)
    }
  },
  // 新增回覆
  postReply: async (req, cb) => {
    try {
      const { comment } = req.body
      if (!comment.trim()) throw new Error('回覆內容不能空白') // 需加上status 400
      const tweet = await Tweet.findByPk(req.params.tweet_id, {
        include: { model: User }
      })
      if (!tweet) throw new Error('推文不存在')
      const reply = await Reply.create({
        UserId: getUser(req).dataValues.id,
        TweetId: tweet.id,
        comment
      })
      cb(null, { success: true, reply })
    } catch (err) {
      cb(err)
    }
  },
  // 取得某推文的回覆
  getReply: async (req, cb) => {
    try {
      const tweet = await Tweet.findByPk(req.params.tweet_id)
      if (!tweet) throw new Error('推文不存在')
      const replies = await Reply.findAll(
        { where: { TweetId: tweet.id } }
      )
      cb(null, replies)
    } catch (err) {
      cb(err)
    }
  }
}

module.exports = tweetServices
