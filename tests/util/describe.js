import { suite } from "uvu";

const describe = (name, function_) => {
    const tests = suite(name);
  
    function_(tests);
    
    tests.run();
};

export default describe;
