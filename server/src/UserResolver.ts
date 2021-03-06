import { User } from "./entity/User";
import "reflect-metadata";
import {
	Arg,
	Ctx,
	Field,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	UseMiddleware,
} from "type-graphql";
import { compare, hash } from "bcryptjs";
import { MyContext } from "./MyContext";
import { createAccessToken, createRefreshToken } from "./auth";
import { isAuth } from "./isAuth";
import { sendRefreshToken } from "./sendRefreshToken";
import { getConnection } from "typeorm";

@ObjectType()
class LoginResponse {
	@Field()
	accessToken: string;
}

@Resolver()
export class UserResolver {
	@Query(() => String)
	hello() {
		return "Hi!";
	}

	@Query(() => String)
	@UseMiddleware(isAuth)
	bye(@Ctx() { payload }: MyContext) {
		return `Your user Id is: ${payload.userId}`;
	}

	@Query(() => [User])
	users() {
		return User.find();
	}

	@Mutation(() => Boolean)
	async register(@Arg("email") email: string, @Arg("password") password: string) {
		const hashedPassword = await hash(password, 12);

		try {
			await User.insert({
				email,
				password: hashedPassword,
			});
			return true;
		} catch (err) {
			console.log("err", err);
			return false;
		}
	}

	@Mutation(() => LoginResponse)
	async login(
		@Arg("email") email: string,
		@Arg("password") password: string,
		@Ctx() { res }: MyContext
	): Promise<LoginResponse> {
		const user = await User.findOne({ where: { email } });

		if (!user) {
			throw new Error("Could not find user with that email");
		}

		const valid = await compare(password, user.password);

		if (!valid) {
			throw new Error("Wrong password");
		}

		// login successful

		sendRefreshToken(res, createRefreshToken(user));

		return {
			accessToken: createAccessToken(user),
		};
	}

	// test endpoint to revoke refresh tokens by incrementing the token version
	@Mutation(() => Boolean)
	async revokeRefreshToken(@Arg("userId", () => Int) userId: number) {
		try {
			await getConnection()
				.getRepository(User)
				.increment({ id: userId }, "tokenVersion", 1);
			return true;
		} catch (error) {
			console.log("Revoke refresh token error =>> ", error);
			return false;
		}
	}
}
