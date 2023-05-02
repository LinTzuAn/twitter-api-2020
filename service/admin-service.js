const { Like, Tweet, User, Reply, sequelize } = require('../models')

const adminServices = {
  // 取得 user 資料
  getUsers: async (req, cb) => {
    try {
      const data = await User.findAll({
        attributes: [
          'id',
          'email',
          'name',
          'account',
          'image',
          'avatar',
          [sequelize.literal(`( SELECT COUNT(*) FROM Tweets WHERE User_id = User.id )`), 'TweetsCount'],
          [sequelize.literal(`( SELECT COUNT(*) FROM Followships WHERE follower_id = User.id )`), 'Followings'],
          [sequelize.literal(`( SELECT COUNT(*) FROM Followships WHERE following_id = User.id )`), 'Followers'],
          [sequelize.literal(`( SELECT COUNT(*) FROM Likes INNER JOIN Tweets ON Tweets.id = Likes.tweet_id WHERE Tweets.User_id = User.id)`), 'LikesCount']
        ],
        order: [
          [sequelize.literal('TweetsCount'), 'DESC']
        ]
      })
      cb(null, data)
    } catch (err) {
      cb(err)
    }
  },
  // 顯示所有推文
  getTweets: async (req, cb) => {
    try {
      const tweets = await Tweet.findAll({
        include: [{
          model: User,
          attributes: [
            'account',
            'name',
            'avatar'
          ]
        }],
        raw: true,
        nest: true,
        order: [
          ['createdAt', 'DESC'],
          ['UserId', 'ASC']
        ]
      })
      const result = tweets.map(tweet => ({
        ...tweet,
        description: tweet.description.slice(0, 50)
      }))
      cb(null, { success: true, result })
    } catch (err) {
      cb(err)
    }
  },
  // 刪除單一推文
  deleteTweet: async (req, cb) => {
    try {
      const tweet = await sequelize.transaction(async (t) => {
        const post = await Tweet.findByPk(req.params.id, { transaction: t })
        await Reply.destroy({ where: { TweetId: req.params.id } }, { transaction: t })
        await Like.destroy({ where: { TweetId: req.params.id } }, { transaction: t })
        return post
      })

      // const [tweet, reply, like] = await Promise.all([
      //   Tweet.findByPk(req.params.id),
      //   Reply.destroy({ where: { TweetId: req.params.id } }),
      //   Like.destroy({ where: { TweetId: req.params.id } })
      // ])
      if (!tweet) throw new Error('找不到這則推文')
      const removedTweet = await tweet.destroy()
      cb(null, { success: true, removedTweet })
    } catch (err) {
      cb(err)
    }
  }
}

module.exports = adminServices
