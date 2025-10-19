import axios from 'axios';
import PQueue from 'p-queue';
import dotenv from "dotenv"

dotenv.config();

const API_URL = 'http://localhost:3001/api';

const TEST_CONFIG = {
  CONCURRENT_USERS: 500,
  REQUESTS_PER_USER: 15,
};

const axiosInstance = axios.create();

const setupRetryInterceptor = () => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      if (response && response.status === 429) {
        const retryCount = (config._retryCount || 0) + 1;
        if (retryCount >= 5) {
          console.error(`Max retries reached for ${config.url}`);
          return Promise.reject(error);
        }

        config._retryCount = retryCount;
        const retryDelay = 2 ** retryCount * 1000; 
        console.warn(`Rate limit hit. Retrying ${config.url} in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return axiosInstance(config);
      }
      return Promise.reject(error);
    }
  );
};

// Queue for controlling concurrency
const queue = new PQueue({ concurrency: 100 }); // Adjust based on your machine's capacity

interface TestResult {
  success: number;
  failed: number;
  totalRequests: number;
  totalTime: number;
  avgResponseTime: number;
  errors: string[];
}

async function registerUser(userId: number): Promise<{ accessToken: string; userId: string }> {
  const response = await axiosInstance.post(`${API_URL}/auth/register`, {
    email: `stresstest${userId}@example.com`,
    username: `stressuser${userId}`,
    password: 'TestPass123!',
  }, { withCredentials: true });

  return {
    accessToken: response.data.data.accessToken,
    userId: response.data.data.user.id,
  };
}

async function setupTOTP(accessToken: string): Promise<{ secret: string; backupCodes: string[] }> {
  const response = await axiosInstance.post(
    `${API_URL}/2fa/totp/setup`,
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
    }
  );

  return {
    secret: response.data.data.secret,
    backupCodes: response.data.data.backupCodes,
  };
}

// Function to execute a series of tasks using the queue
async function executeTasks(tasks: (() => Promise<void>)[]): Promise<TestResult> {
  const results: TestResult = {
    success: 0,
    failed: 0,
    totalRequests: tasks.length,
    totalTime: 0,
    avgResponseTime: 0,
    errors: [],
  };

  const startTime = process.hrtime.bigint();
  const responseTimes: bigint[] = [];

  const promises = tasks.map(task => 
    queue.add(async () => {
      const reqStartTime = process.hrtime.bigint();
      try {
        await task();
        results.success++;
        responseTimes.push(process.hrtime.bigint() - reqStartTime);
      } catch (error: any) {
        results.failed++;
        const errorMessage = error.response ? error.response.statusText : error.message;
        if (!results.errors.includes(errorMessage)) {
          results.errors.push(errorMessage);
        }
      }
    })
  );

  await Promise.all(promises);

  const endTime = process.hrtime.bigint();
  results.totalTime = Number((endTime - startTime) / 1000000n); // Convert to ms
  const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0n);
  results.avgResponseTime = results.success > 0 ? Number(totalResponseTime / BigInt(results.success)) / 1000000 : 0;

  return results;
}

async function stressTestRegistration(): Promise<TestResult> {
  console.log(`\n🔥 Stress Testing: User Registration (${TEST_CONFIG.CONCURRENT_USERS} concurrent users)`);
  const tasks = Array.from({ length: TEST_CONFIG.CONCURRENT_USERS }, (_, i) => () => registerUser(i + Date.now()).then(() => {}));
  return executeTasks(tasks);
}

async function stressTestLogin(): Promise<TestResult> {
  console.log(`\n🔥 Stress Testing: User Login (${TEST_CONFIG.CONCURRENT_USERS} concurrent users, ${TEST_CONFIG.REQUESTS_PER_USER} requests each)`);

  const users: Array<{ email: string; password: string }> = [];
  for (let i = 0; i < TEST_CONFIG.CONCURRENT_USERS; i++) {
    const userId = i + Date.now();
    try {
      await registerUser(userId);
      users.push({
        email: `stresstest${userId}@example.com`,
        password: 'TestPass123!',
      });
    } catch (error) {
      // User might already exist from a previous test run
      console.error("User might already exist", error)
      throw error
    }
  }
  
  const tasks = users.flatMap(user =>
    Array.from({ length: TEST_CONFIG.REQUESTS_PER_USER }, () => () => 
      axiosInstance.post(`${API_URL}/auth/login`, {
        emailOrUsername: user.email,
        password: user.password,
      }, { withCredentials: true }).then(() => {})
    )
  );
  return executeTasks(tasks);
}

async function stressTestTOTPSetup(): Promise<TestResult> {
  console.log(`\n🔥 Stress Testing: TOTP Setup (${TEST_CONFIG.CONCURRENT_USERS} concurrent users)`);

  const tasks = Array.from({ length: TEST_CONFIG.CONCURRENT_USERS }, (_, i) => async () => {
    const { accessToken } = await registerUser(i + Date.now());
    await setupTOTP(accessToken);
  });
  return executeTasks(tasks);
}

function printResults(testName: string, results: TestResult) {
  console.log(`\n📊 Results for ${testName}:`);
  console.log(`  ✅ Successful: ${results.success}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  ⏱️  Total Time: ${results.totalTime}ms`);
  console.log(`  ⚡ Avg Response Time: ${results.avgResponseTime.toFixed(2)}ms`);
  console.log(`  📈 Requests/sec: ${((results.success + results.failed) / (results.totalTime / 1000)).toFixed(2)}`);

  if (results.errors.length > 0) {
    console.log(`  ⚠️  Unique Errors: ${results.errors.slice(0, 5).join(', ')}`);
  }
}

async function runStressTests() {
  console.log('🚀 Starting Stress Tests...');
  setupRetryInterceptor();
  
  try {
    const registrationResults = await stressTestRegistration();
    printResults('User Registration', registrationResults);

    const loginResults = await stressTestLogin();
    printResults('User Login', loginResults);

    const totpResults = await stressTestTOTPSetup();
    printResults('TOTP Setup', totpResults);

    console.log('\n✅ Stress tests completed!');

    const totalRequests = registrationResults.totalRequests + loginResults.totalRequests + totpResults.totalRequests;
    const totalSuccess = registrationResults.success + loginResults.success + totpResults.success;

    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Requests: ${totalRequests}`);
    console.log(`  Success Rate: ${((totalSuccess / totalRequests) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  }
}

runStressTests();
