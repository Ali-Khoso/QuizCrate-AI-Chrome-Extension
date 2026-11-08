const DEMO_COURSES = [
  { id: 'demo-algorithms', name: 'Analysis of Algorithms', section: 'Computer Science • Semester 5', courseState: 'ACTIVE' },
  { id: 'demo-compiler', name: 'Compiler Construction', section: 'Computer Science • Semester 5', courseState: 'ACTIVE' },
  { id: 'demo-web', name: 'Web Engineering', section: 'Computer Science • Semester 5', courseState: 'ACTIVE' }
];

const DEMO_LECTURES = {
  'demo-algorithms': [
    { id: 'a1', title: 'Lecture 01 • Introduction to Algorithms', topicName: 'Fundamentals', description: 'An algorithm is a finite sequence of steps. Big-O is an asymptotic upper bound, Big-Omega is a lower bound, and Big-Theta is a tight bound. A single linear traversal takes O(n) time.', materials: [] },
    { id: 'a2', title: 'Lecture 05 • Merge Sort', topicName: 'Sorting', description: 'Merge sort splits the input into halves and merges sorted halves. Its recurrence is T(n) = 2T(n/2) + Theta(n), and it takes Theta(n log n) time and typically Theta(n) auxiliary space.', materials: [] },
    { id: 'a3', title: 'Lecture 06 • Quick Sort', topicName: 'Sorting', description: 'Quick sort partitions around a pivot. Balanced splits lead to Theta(n log n); repeated unbalanced splits give Theta(n^2). The first-element pivot can be poor on sorted input.', materials: [] },
    { id: 'a4', title: 'Lecture 07 • Master Theorem', topicName: 'Recurrences', description: 'For T(n) = aT(n/b) + f(n), compare f(n) with n^(log_b a) to identify the Master Theorem case. Merge sort falls in the matching case.', materials: [] },
    { id: 'a5', title: 'Lecture 08 • Selection Sort', topicName: 'Sorting', description: 'Selection sort finds the smallest remaining element and swaps it to its final position. It takes Theta(n^2) comparisons in best and worst cases and O(1) auxiliary space.', materials: [] }
  ],
  'demo-compiler': [
    { id: 'c1', title: 'Lecture 01 • Compiler Phases', topicName: 'Compilers', description: 'A compiler performs lexical analysis, syntax analysis, semantic analysis, intermediate code generation, optimization, and code generation. A symbol table stores identifier information.', materials: [] },
    { id: 'c2', title: 'Lecture 04 • Lexical Analysis', topicName: 'Lexing', description: 'Lexical analysis converts characters into tokens including identifiers, keywords, numbers and operators. Regular expressions and finite automata define and recognize token patterns.', materials: [] }
  ],
  'demo-web': [
    { id: 'w1', title: 'Lecture 06 • Express Middleware', topicName: 'Backend', description: 'Express middleware runs in request order. next() passes control to subsequent middleware. An error handler receives err, req, res, and next.', materials: [] },
    { id: 'w2', title: 'Lecture 08 • JWT Authentication', topicName: 'Security', description: 'A signed JWT consists of a header, payload, and signature. The signature ensures token integrity. The payload is not encrypted by default.', materials: [] }
  ]
};

const DEMO_QUESTIONS = [
  { lectureId:'a1', sourceTitle:'Lecture 01 • Introduction to Algorithms', question:'Which asymptotic notation provides a tight bound?', options:['Big-O','Big-Theta','Big-Omega','Little-o'], answerIndex:1, explanation:'Theta provides both asymptotic upper and lower bounds.' },
  { lectureId:'a2', sourceTitle:'Lecture 05 • Merge Sort', question:'What is the recurrence for ordinary two-way merge sort?', options:['T(n)=T(n-1)+n','T(n)=2T(n/2)+Theta(n)','T(n)=T(n/2)+1','T(n)=2T(n)+n'], answerIndex:1, explanation:'There are two recursive calls on half-size inputs and a linear merging step.' },
  { lectureId:'a2', sourceTitle:'Lecture 05 • Merge Sort', question:'What is the time complexity of merge sort?', options:['Theta(n^2)','Theta(n)','Theta(n log n)','Theta(log n)'], answerIndex:2, explanation:'Each recursion level does linear merging work across logarithmically many levels.' },
  { lectureId:'a3', sourceTitle:'Lecture 06 • Quick Sort', question:'What is the worst-case time complexity of quicksort?', options:['Theta(n)','Theta(log n)','Theta(n log n)','Theta(n^2)'], answerIndex:3, explanation:'Repeatedly splitting into partitions of sizes zero and n−1 yields quadratic work.' },
  { lectureId:'a3', sourceTitle:'Lecture 06 • Quick Sort', question:'With a first-element pivot, which input can cause poor quicksort partitions?', options:['Already sorted ascending input','Well-shuffled input with balanced splits','Any input with even length','Every input of unique elements'], answerIndex:0, explanation:'The smallest first pivot repeatedly produces a zero-sized partition.' },
  { lectureId:'a4', sourceTitle:'Lecture 07 • Master Theorem', question:'What is the solution to T(n)=2T(n/2)+n?', options:['Theta(n^2)','Theta(n log n)','Theta(n)','Theta(log n)'], answerIndex:1, explanation:'The nonrecursive work matches n^(log_2 2), giving Theta(n log n).' },
  { lectureId:'a5', sourceTitle:'Lecture 08 • Selection Sort', question:'What does each outer pass of selection sort do?', options:['Merges two subarrays','Chooses a pivot','Places the remaining minimum in position','Sorts a half recursively'], answerIndex:2, explanation:'It scans the remaining suffix to find the smallest item.' },
  { lectureId:'a5', sourceTitle:'Lecture 08 • Selection Sort', question:'How many comparisons does standard selection sort perform asymptotically?', options:['Theta(1)','Theta(log n)','Theta(n)','Theta(n^2)'], answerIndex:3, explanation:'Successively scanning suffixes costs a quadratic sum of comparisons.' },
  { lectureId:'c1', sourceTitle:'Lecture 01 • Compiler Phases', question:'Which compiler structure records names, types, and scopes?', options:['Stack frame','Symbol table','Token stream','Machine cache'], answerIndex:1, explanation:'The symbol table stores identifier attributes needed by compiler phases.' },
  { lectureId:'c2', sourceTitle:'Lecture 04 • Lexical Analysis', question:'Which compiler stage groups characters into tokens?', options:['Lexical analysis','Optimization','Code generation','Linking'], answerIndex:0, explanation:'The lexer recognizes keywords, identifiers, numbers, and operators.' },
  { lectureId:'w1', sourceTitle:'Lecture 06 • Express Middleware', question:'What does next() do inside an Express middleware function?', options:['Terminates the process','Signs a token','Passes control to the next middleware','Closes the socket'], answerIndex:2, explanation:'next() advances request handling along the middleware stack.' },
  { lectureId:'w2', sourceTitle:'Lecture 08 • JWT Authentication', question:'What does a JWT signature provide by default?', options:['Encrypted user data','Message integrity','Private key recovery','Database isolation'], answerIndex:1, explanation:'A signature checks integrity, not payload secrecy.' }
];
const DEMO_EXTRA_QUESTIONS = [];
