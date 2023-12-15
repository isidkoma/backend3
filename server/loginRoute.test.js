const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/App'); // Assuming your Express app is in a separate file
const bcrypt = require('bcryptjs');
const User = require('./models/user_schema');
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Login Route', () => {
  // Dummy user for testing
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: bcrypt.hashSync('Test123!', 10), // Hashed password
  };

  // Before each test, create a test user in the database
  beforeEach(async () => {
    await User.create(testUser);
  });

  // After each test, delete the test user from the database
  afterEach(async () => {
    await User.deleteOne({ username: testUser.username });
  });

  it('should log in a user with valid credentials', (done) => {
    chai
      .request(app)
      .post('/login')
      .send({ identifier: testUser.username, password: 'Test123!' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('token');
        expect(res.body).to.have.property('username');
        done();
      });
  });

  it('should return an error with invalid credentials', (done) => {
    chai
      .request(app)
      .post('/login')
      .send({ identifier: testUser.username, password: 'InvalidPassword' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body).to.have.property('error', 'Invalid credentials');
        done();
      });
  });

  it('should return an error with missing fields', (done) => {
    chai
      .request(app)
      .post('/login')
      .send({ identifier: '', password: '' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error', 'Login and password are required');
        done();
      });
  });

  it('should return an error on internal server error', (done) => {
    // Mock a database error
    const stub = sinon.stub(User, 'findOne');
    stub.throws(new Error('Database error'));

    chai
      .request(app)
      .post('/login')
      .send({ identifier: testUser.username, password: 'Test123!' })
      .end((err, res) => {
        expect(res).to.have.status(500);
        expect(res.body).to.have.property('error', 'Internal Server Error');
        stub.restore(); // Restore the stubbed function
        done();
      });
  });
});
