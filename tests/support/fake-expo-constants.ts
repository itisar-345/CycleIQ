// Pretend to be Expo Go so notification modules never touch native notification APIs in tests.
const Constants = { executionEnvironment: "storeClient" };
export default Constants;
