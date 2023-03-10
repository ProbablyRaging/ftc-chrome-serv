const router = require('express').Router();
const passport = require('passport');
const discordStrategy = require('passport-discord').Strategy;
const extUsers = require('../schema/users');
const fetch = require('node-fetch');

async function addRoleToUser(userId) {
    try {
        await fetch(`https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${userId}/roles/${process.env.PING_ROLE}`, {
            method: 'PUT',
            headers: {
                Authorization: `${process.env.API_TOKEN}`
            }
        });
    } catch (err) {
        console.log('There was a problem : ', err);
    }
}

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new discordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CLIENT_REDIRECT,
    scope: ['identify', 'guilds'],
}, async (accessToken, refreshToken, profile, done) => {
    // Check if user is in the server or not, return if not
    const isInGuild = profile.guilds && profile.guilds.some(guild => guild.id === process.env.GUILD_ID);
    if (!isInGuild) return done(null, null);
    // Check if user entry exists, update or create
    const entryExists = await extUsers.findOne({ userId: profile.id });
    const oneDay = 24 * 60 * 60 * 1000;
    const expires = new Date().valueOf() + oneDay;
    if (entryExists) {
        await extUsers.findOneAndUpdate({
            userId: profile.id
        }, {
            username: profile.username,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expires: expires
        });
        // Give the user the extension ping role in the server
        addRoleToUser(profile.id);
        done(null, profile);
    } else {
        const newEntry = await extUsers.create({
            userId: profile.id,
            username: profile.username,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expires: expires,
            tokens: null,
            tokenCap: null,
            limit: null
        });
        await newEntry.save();
        // Give the user the extension ping role in the server
        addRoleToUser(profile.id);
        done(null, profile);
    }
}));

router.get('/', (req, res, next) => {
    passport.authenticate('discord');
});

router.get('/redirect', (req, res, next) => {
    passport.authenticate('discord', {
        failureRedirect: '/error?message=You+must+be+a+Discord+server+member+to+use+this+app',
        successReturnToOrRedirect: '/auth/proceed',
        keepSessionInfo: false,
    })(req, res, next);
});

router.get('/proceed', async (req, res) => {
    if (!req.user) {
        res.render('error');
        return;
    }
    res.redirect(`/auth/success?user=${req.user.id}`);
});

router.get('/success', async (req, res) => {
    res.render('success', { message: 'Successfully authenticated. You can close this window now' });
});

module.exports = router;