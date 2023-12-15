const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const signupRouter = require('./signupRoutes');
const loginRouter = require('./loginRoutes');
const userModel = require('./models/user_schema');
const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY || 'your_secret_key'; // Use an environment variable for the secret key
const chartModel = require('./models/chart_schema');
require('dotenv').config();

const PORT = process.env.PORT || 3078;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://purnatummala2003:Ammulu1307@cluster0.oibub3r.mongodb.net/?retryWrites=true&w=majority'; // Use an environment variable for the MongoDB URI

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const app = express();



app.use(cors());

	app.use(express.json());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(express.static(path.join(__dirname, 'public')));
	app.use((req, res, next) => {
		next();
	   });


// Enable CORS for specific routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

 
app.get("/api/get_budget", async (req, res) => {
	try {
	  // Token validation
	  const user = await validateToken(req.query.token); // Use query parameter to pass the token
	  if (!user) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  res.json({
		ok: 1,
		budgetData: user.budgetData,
		income: user.income,
		savings: user.savings,
	  });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Internal server error" });
	}
  });
  

app.post("/api/update_income", async (req, res) => {
	try {
	  // Token validation
	  const user = await validateToken(req.body.token);
	  if (!user) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  const income = parseFloat(req.body.income);
	  if (isNaN(income)) {
		return res.status(400).json({ error: "Invalid income value" });
	  }
  
	  // Update operation
	  const updateResult = await userModel.updateOne(
		{ username: user.username },
		{ $set: { income: income } },
		{ upsert: true }
	  );
  
	  // Check if update was successful
	  if (updateResult.matchedCount === 0) {
		return res.status(404).json({ error: "User not found" });
	  }
  
	  res.json({ ok: 1, income: income });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Internal server error" });
	}
  });
  


  app.post("/api/update_savings", async (req, res) => {
	try {
	  // Validate token and retrieve user
	  const user = await validateToken(req.body.token);
	  if (!user) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  const savings = parseFloat(req.body.savings);
	  if (isNaN(savings)) {
		return res.status(400).json({ error: "Invalid savings value" });
	  }
  
	  // Update user's savings in the database
	  const result = await userModel.updateOne(
		{ username: user.username },
		{ $set: { savings: savings } },
		{ upsert: true }
	  );
  
	  // Handle the case where the user is not found
	  if (result.matchedCount === 0) {
		return res.status(404).json({ error: "User not found" });
	  }
  
	  // Send successful response
	  res.json({ ok: 1, savings: savings });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Internal server error" });
	}
  });

  app.post("/api/add_budget", async (req, res) => {
	try {
	  // Extract the token from the query parameter
	  const token = req.query.token;
	  if (!token) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  // Token validation
	  const user = await validateToken(token);
	  if (!user) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  // Check for existing budget item with the same title
	  const existingBudgetItem = user.budgetData.find((budget) => budget.title === req.body.title);
	  if (existingBudgetItem) {
		return res.json({ ok: 0, error: "Error: There is already a budget item with the same title." });
	  }
  
	  // Color processing
	  let color = processColor(req.body.color);
  
	  // Create new budget document
	  const newBudget = new chartModel({
		title: req.body.title,
		budget: req.body.budget,
		color: color,
	  });
  
	  // Add new budget item to user's budgetData and update in DB
	  user.budgetData.push(newBudget);
	  await userModel.updateOne({ username: user.username }, { $set: { budgetData: user.budgetData } });
  
	  // Respond to the client
	  res.json({ ok: 1, response: "Budget data added." });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Internal server error" });
	}
  });
  

// Function to process color input
function processColor(color) {
	if (color.startsWith("#")) {
	  color = color.substring(1);
	}
	if (/^[A-Fa-f0-9]+$/.test(color)) {
	  if (color.length === 6 || color.length === 8) {
		return "#" + color;
	  } else if (color.length === 3 || color.length === 4) {
		return "#" + color.split("").map(v => v + v).join("");
	  }
	}
	return color; // Return original color if it doesn't match the criteria
  }

  app.post("/api/delete_from_budget", async (req, res) => {
	try {
	  // Token validation and user retrieval
	  const user = await validateToken(req.body.token);
	  if (!user) {
		return res.status(401).json({ error: "Unauthorized access" });
	  }
  
	  // Update user's budget data by filtering out the specified item
	  user.budgetData = user.budgetData.filter(item => item.title !== req.body.title);
  
	  // Store updated user in the database
	  await userModel.updateOne(
		{ username: user.username },
		{ $set: { budgetData: user.budgetData } }
	  );
  
	  // Respond to the client
	  res.json({ ok: 1, response: "Budget data deleted." });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Internal server error" });
	}
  });
  
  function checkTokenExpiration(token) {
	try {
	  const decoded = jwt.decode(token);
	  if (!decoded) {
		return false; // Token is invalid
	  }
	  const currentTimestamp = Date.now() / 1000; // Current time in seconds
	  return decoded.exp <= currentTimestamp; // Token has expired if exp is less than or equal to current time
	} catch (error) {
	  return true; // Token is expired or invalid
	}
  }
  app.use((req, res, next) => {
	const token = req.query.token; // Get the token from the request (you can adapt this as needed)
	if (token && checkTokenExpiration(token)) {
	  // Token has expired, restart the server
	  restartServer();
	} else {
	  next(); // Continue processing the request
	}
  });
  
  // Define a function to restart the server
  function restartServer() {
	console.log('Restarting server...');
	// For simplicity, we're just exiting the process here, which will trigger an automatic server restart if you are using a process manager like PM2 or a container orchestrator like Docker Compose.
	process.exit(1);
  }
  

// Replace with your actual secret key
  
async function validateToken(token) {
	
	if (!token) {
	  throw new Error("No token provided, please log in again.");
	}
  
	try {
	  const decoded = jwt.verify(token, secretKey);
	  const user = await userModel.findOne({ username: decoded.username });
  
	  if (!user) {
		throw new Error("User not found, please log in again.");
	  }
  
	  if (decoded.iat < user.validTime) {
		throw new Error("Token is no longer valid, please log in again.");
	  }
  
	  return user;
	} catch (error) {
	  console.error("Error in token validation: ", error.name, error.message);
  
	  // Specific error handling
	  if (error instanceof jwt.TokenExpiredError) {
		throw new Error("Token expired, please log in again.");
	  } else if (error instanceof jwt.JsonWebTokenError) {
		throw new Error("Invalid token, please log in again.");
	  } else {
		throw new Error("Error validating token.");
	  }
	}
  }
  

app.listen(PORT,'localhost', () => {
    console.log(`Server running on port ${PORT}`);
});
