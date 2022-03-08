import { User } from "./entity/User";
import "reflect-metadata";
import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";

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
		@Arg("password") password: string
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
		return {
			accessToken: sign({ userId: user.id }, "secret", { expiresIn: "15m" }),
		};
	}
}
