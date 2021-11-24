import { suite } from "uvu";

export default (name, fn) => {
    const tests = suite(name);
  
    fn(tests);
    
    tests.run();
};
