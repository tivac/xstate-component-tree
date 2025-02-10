import { suite } from "uvu";

const describe = (name, body) => {
    const tests = suite(name);
  
    body(tests);
    
    tests.run();
};

export default describe;
