import { validateQuery, validateQueryCustom } from '~~/utils/validateQuery';
import { AuthProvider, UserMetadata, User, UserModel } from '~/models/user';
import { pool } from '~/server/postgres';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export default eventHandler(async (event: any) => {
  const body = await readBody(event);

  const { email, password } = body as User;
  let { auth_provider } = body as User;
  const { display_name } = body as UserMetadata;
  let { avatar_url } = body as UserMetadata;

  if (password != null || password != undefined) {
    if (validatePassword(password)) {
      return {
        statusCode: 400,
        body: 'Password is too short.'
      }
    }
  }

  if (validateQuery(email, auth_provider, display_name) == false) {
    return {
      statusCode: 400,
      body: 'We couldn\'t validate your info.'
    }
  }

  if (validateQueryCustom(display_name, 1, 25) == false) {
    return {
      statusCode: 400,
      body: 'Invalid display name. Greater than 25 characters.'
    }
  }

  if (validateEmail(email) == false) {
    return {
      statusCode: 400,
      body: 'Invalid email.'
    }
  }

  if (await UserModel.exists({ email })) {
    return {
      statusCode: 400,
      body: 'User already exists.'
    }
  }

  let newUserModel: any = null

  if (!avatar_url) {
    avatar_url = 'https://breezebase.net/assets/images/default-avatar.png';
  }

  if (checkAuthProvider(auth_provider) == false) {
    auth_provider = AuthProvider.email;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    newUserModel = new UserModel({
      email: email,
      display_name: display_name,
      password: hashedPassword,
      auth_provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  else {
    if (auth_provider === 'google') {
      auth_provider = AuthProvider.google;
    }
    else if (auth_provider === 'github') {
      auth_provider = AuthProvider.github;
    }
    else if (auth_provider === 'discord') {
      auth_provider = AuthProvider.discord;
    }

    newUserModel = new UserModel({
      email: email,
      display_name: display_name,
      auth_provider: auth_provider,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const transaction = await mongoose.startSession();

  try {
    await newUserModel.save();
    await transaction.commitTransaction();
  }
  catch (err) {
    await transaction.abortTransaction();
  }
  
  try {
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO user_metadata (email, display_name, avatar_url) VALUES ($1, $2, $3)',
      [ email, display_name, avatar_url ]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  return {
    statusCode: 200,
    body: 'User created successfully.'
  }
});

function checkAuthProvider(authProvider: string) {
  if (authProvider === 'email' || authProvider === AuthProvider.email || authProvider === '' || authProvider === null || authProvider === undefined) {
    return false;
  }
  
  return true;
}

function validateEmail(email: string) {
  const re = /@/;
  return re.test(email);
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return false;
  }

  return true;
}