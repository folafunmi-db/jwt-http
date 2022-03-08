import "reflect-metadata";
import "dotenv/config";
import { createConnection } from "typeorm";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./UserResolver";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import { User } from "./entity/User";
import { createAccessToken, createRefreshToken } from "./auth";
import { sendRefreshToken } from "./sendRefreshToken";

(async () => {
	const app = express();
	app.use(cookieParser());
	app.get("/", (_req, res) => res.send("hello"));
	app.post("/refresh_token", async (req, res) => {
		const aCookie = req.cookies.gid;

		if (!aCookie) {
			return res.send({ ok: false, accessToken: "" });
		}

		let payload: any = null;

		try {
			payload = verify(aCookie, process.env.REFRESH_TOKEN_SECRET!);
		} catch (err) {
			console.log("Error =>> ", err);
			return res.send({ ok: false, accessToken: "" });
		}

		const user = await User.findOne({ id: payload.userId });

		if (!user) {
			return res.send({ ok: false, accessToken: "" });
		}

		if (user.tokenVersion !== payload.tokenVersion) {
			return res.send({ ok: false, accessToken: "" });
		}

		sendRefreshToken(res, createRefreshToken(user));

		return res.send({ ok: false, accessToken: createAccessToken(user) });
	});

	await createConnection();

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver],
		}),
		context: ({ req, res }) => ({ req, res }),
	});

	await apolloServer.start();
	apolloServer.applyMiddleware({ app });

	app.listen(4000, () => {
		console.log("express server started");
	});
})();
