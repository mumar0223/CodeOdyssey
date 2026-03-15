export const questions = [
  {
    title: "Optimal Parentheses Restoration",
    description:
      'Given a string `s` that contains parentheses and lowercase English letters, your task is to remove the minimum number of invalid parentheses to make the input string valid.\n\nA string of parentheses is valid if:\n1. It is the empty string, contains only lowercase letters, or\n2. It can be written as `AB` (`A` concatenated with `B`), where `A` and `B` are valid strings, or\n3. It can be written as `(A)`, where `A` is a valid string.\n\nYou must return **all possible valid strings** that can be formed by removing the minimum number of parentheses.\n\n**Important:** \n- The output array MUST be sorted in **lexicographical order**.\n- If no valid string can be formed (or if the input becomes empty after necessary removals), return an array containing an empty string: `[""]`.\n- Lowercase letters in the string should be preserved and ignored when determining valid parentheses.\n\n### Example 1\n**Input:** `s = "()())()"`\n**Output:** `["(())()", "()()()"]`\n\n### Example 2\n**Input:** `s = "(a)())()"`\n**Output:** `["(a())()", "(a)()()"]`\n\n### Example 3\n**Input:** `s = ")("`\n**Output:** `[""]`\n\n### Constraints\n- $1 \\le s.length \\le 20$\n- `s` consists of lowercase English letters and parentheses `(` and `)`.',
    imageUrl:
      "https://utfs.io/f/c26704f0-0863-4f4f-8dc2-9241a65edd0b-fq7qzs.jpg",
    diagramUrl:
      "https://utfs.io/f/b5cc1594-eff1-4832-88bb-192266b591db-rd9scz.jpg",
    voiceUrl:
      "https://utfs.io/f/1f71bc0c-8f59-4a58-a543-5c1c4f59bf54-iaekmf.wav",
    startercode_python: "def solution(s):\n    pass",
    startercode_javascript: "function solution(s) {\n\n}",
    startercode_java:
      "import java.util.*;\n\nclass Solution {\n    public boolean solution(String s) {\n        return false;\n    }\n}",
    startercode_cpp:
      "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool solution(string s) {\n        return false;\n    }\n};",
    startercode_typescript: "function solution(s: string): boolean {\n\n}",
    inputFormat: "A single string `s`.",
    outputFormat:
      "An array of strings representing all possible valid formats, sorted lexicographically.",
    constraints: [
      "1 <= s.length <= 20",
      "s contains only characters '(', ')', and lowercase English letters",
    ],
    testCases: [
      {
        input: ["()())()"],
        expected: ["(())()", "()()()"],
      },
      {
        input: ["(a)())()"],
        expected: ["(a())()", "(a)()()"],
      },
      {
        input: [")("],
        expected: [""],
      },
    ],
    hidden_testcases: [
      {
        input: ["(r(()()("],
        expected: ["(r())", "(r)()", "r(())", "r()()"],
      },
      {
        input: [")a()b("],
        expected: ["a()b"],
      },
      {
        input: ["(((((((("],
        expected: [""],
      },
      {
        input: ["()())()()()"],
        expected: ["(())()()()", "()()()()()"],
      },
      {
        input: ["x("],
        expected: ["x"],
      },
    ],
    timeLimit: 45,
    penaltyInterval: 5,
    penaltyDrop: 10,
  },
  {
    title: "The Cyclic Memory Heap: Resolution and K-Group Reversal",

    description:
      "You are competing in an advanced systems programming round. Your task is to process a simulated memory heap containing a sequence of linked list nodes.\n\nThe heap is represented as a 2D array `memory`, where each element at index `i` is a node formatted as `[value, next_index]`. The value represents the integer payload of the node, and `next_index` represents the array index of the next node. A `next_index` of `-1` signifies a null pointer (the end of the list).\n\nThe linked list begins at the given `head_index`.\n\nDue to a critical memory corruption, the linked list might contain a single infinite cycle. Your system must perform the following operations in exact order:\n\n1. **Resolve the Cycle**: Detect if a cycle exists in the linked list. If a cycle is present, pinpoint the node where the cycle begins and break the cycle by setting the last node in the loop's `next_index` to `-1`.\n\n2. **K-Group Reversal**: After ensuring the list is acyclic, reverse nodes in contiguous groups of size `k`. If the remaining nodes are fewer than `k`, leave them unchanged.\n\nReturn the final linked list as a 1D array of node values in traversal order.",

    imageUrl:
      "https://utfs.io/f/d13dfe2a-48bb-4515-9b25-3f15181149a5-fq7qzs.jpg",
    diagramUrl:
      "https://utfs.io/f/9b9334ca-2bcd-414a-a675-e6af2a06554b-rd9scz.jpg",
    voiceUrl:
      "https://utfs.io/f/9a32cff0-197a-4efc-8eae-e4ae12d95a1d-iaekmf.wav",

    startercode_python: `from typing import List

def solution(memory: List[List[int]], head_index: int, k: int) -> List[int]:
    # Write your code here
    pass`,

    startercode_javascript: `function solution(memory, head_index, k) {

}`,

    startercode_typescript: `function solution(memory: number[][], head_index: number, k: number): number[] {

}`,

    startercode_java: `import java.util.*;

class Solution {
    public int[] solution(int[][] memory, int head_index, int k) {

        return new int[]{};
    }
}`,

    startercode_cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> solution(vector<vector<int>>& memory, int head_index, int k) {

        return {};
    }
};`,

    inputFormat:
      "Three parameters:\n1. `memory`: a 2D array `[[value, next_index], ...]`\n2. `head_index`: starting node index\n3. `k`: group size for reversal",

    outputFormat:
      "A 1D array containing the node values after cycle resolution and k-group reversal.",

    constraints: [
      "1 <= memory.length <= 10^5",
      "-10^9 <= value <= 10^9",
      "-1 <= next_index < memory.length",
      "0 <= head_index < memory.length",
      "1 <= k <= 10^5",
      "The list reachable from head_index contains at most one cycle",
    ],

    testCases: [
      {
        input: [
          [
            [10, 1],
            [20, 2],
            [30, 3],
            [40, 4],
            [50, -1],
          ],
          0,
          2,
        ],
        expected: [20, 10, 40, 30, 50],
      },
      {
        input: [
          [
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 2],
          ],
          0,
          3,
        ],
        expected: [3, 2, 1, 4, 5],
      },
      {
        input: [
          [
            [100, 1],
            [200, 2],
            [300, 3],
            [400, 0],
          ],
          0,
          4,
        ],
        expected: [400, 300, 200, 100],
      },
    ],

    hidden_testcases: [
      {
        input: [
          [
            [5, -1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 0],
          ],
          1,
          1,
        ],
        expected: [1, 2, 3, 4, 5],
      },
      {
        input: [
          [
            [99, 1],
            [10, 2],
            [20, 3],
            [30, 4],
            [40, 5],
            [50, 3],
          ],
          1,
          2,
        ],
        expected: [20, 10, 40, 30, 50],
      },
      {
        input: [
          [
            [7, 1],
            [8, 2],
            [9, -1],
          ],
          0,
          10,
        ],
        expected: [7, 8, 9],
      },
      {
        input: [[[42, 0]], 0, 1],
        expected: [42],
      },
      {
        input: [
          [
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5],
            [6, 6],
            [7, 7],
            [8, 8],
            [9, 9],
            [10, 4],
          ],
          0,
          5,
        ],
        expected: [5, 4, 3, 2, 1, 10, 9, 8, 7, 6],
      },
    ],

    timeLimit: 45,
    penaltyInterval: 5,
    penaltyDrop: 10,
  },
];
