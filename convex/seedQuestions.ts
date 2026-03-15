import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if questions already exist
    const existing = await ctx.db.query("questions").first();
    if (existing) return "Questions already seeded";

    const questions = [
      {
        title: "Two Sum",
        difficulty: "Easy",
        topic: "Arrays",
        description:
          "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        input_format:
          "First line: space-separated integers (nums)\nSecond line: integer (target)",
        output_format: "Two space-separated integers (indices)",
        constraints: [
          "2 <= nums.length <= 10^4",
          "-10^9 <= nums[i] <= 10^9",
          "Only one valid answer exists.",
        ],
        examples: [
          {
            input: "2 7 11 15\n9",
            output: "0 1",
            explanation: "nums[0] + nums[1] = 2 + 7 = 9",
          },
          { input: "3 2 4\n6", output: "1 2" },
          { input: "1 5 3 7\n8", output: "1 2" },
        ],
        tags: ["array", "hash-map"],
        starter_code: {
          JavaScript: "function twoSum(nums, target) {\n  // Your code here\n}",
          Python: "def two_sum(nums, target):\n    # Your code here\n    pass",
          "C++":
            "#include <vector>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n}",
          Java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "2 7 11 15\n9", expected: "0 1" },
          { input: "3 2 4\n6", expected: "1 2" },
          { input: "1 5 3 7\n8", expected: "1 2" },
        ],
        hidden_testcases: [
          { input: "3 3\n6", expected: "0 1" },
          { input: "0 4 3 0\n0", expected: "0 3" },
          { input: "-1 -2 -3 -4 -5\n-8", expected: "2 4" },
          { input: "1000000000 -1000000000\n0", expected: "0 1" },
          { input: "2 5 5 11\n10", expected: "1 2" },
        ],
        time_limit: 2000,
        memory_limit: 256,
        locked: false,
      },
      {
        title: "Reverse a String",
        difficulty: "Easy",
        topic: "Strings",
        description:
          "Write a function that reverses a string. The input string is given as an array of characters.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.",
        input_format: "A string",
        output_format: "The reversed string",
        constraints: [
          "1 <= s.length <= 10^5",
          "s[i] is a printable ASCII character.",
        ],
        examples: [
          { input: "hello", output: "olleh" },
          { input: "Hannah", output: "hannaH" },
          { input: "a", output: "a" },
        ],
        tags: ["string", "two-pointers"],
        starter_code: {
          JavaScript: "function reverseString(s) {\n  // Your code here\n}",
          Python: "def reverse_string(s):\n    # Your code here\n    pass",
          "C++":
            "#include <string>\nusing namespace std;\nstring reverseString(string s) {\n    // Your code here\n}",
          Java: "class Solution {\n    public String reverseString(String s) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "hello", expected: "olleh" },
          { input: "Hannah", expected: "hannaH" },
          { input: "a", expected: "a" },
        ],
        hidden_testcases: [
          { input: "", expected: "" },
          { input: "ab", expected: "ba" },
          { input: "racecar", expected: "racecar" },
          { input: "A man a plan", expected: "nalp a nam A" },
          { input: "12345!@#$%", expected: "%$#@!54321" },
        ],
        time_limit: 1000,
        memory_limit: 128,
        locked: false,
      },
      {
        title: "Valid Parentheses",
        difficulty: "Medium",
        topic: "Stacks",
        description:
          "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        input_format: "A string of brackets",
        output_format: "true or false",
        constraints: [
          "1 <= s.length <= 10^4",
          "s consists of parentheses only '()[]{}'.",
        ],
        examples: [
          { input: "()", output: "true" },
          { input: "()[]{}", output: "true" },
          { input: "(]", output: "false" },
        ],
        tags: ["stack", "string"],
        starter_code: {
          JavaScript: "function isValid(s) {\n  // Your code here\n}",
          Python: "def is_valid(s):\n    # Your code here\n    pass",
          "C++":
            "#include <string>\nusing namespace std;\nbool isValid(string s) {\n    // Your code here\n}",
          Java: "class Solution {\n    public boolean isValid(String s) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "()", expected: "true" },
          { input: "()[]{}", expected: "true" },
          { input: "(]", expected: "false" },
        ],
        hidden_testcases: [
          { input: "([)]", expected: "false" },
          { input: "{[]}", expected: "true" },
          { input: "", expected: "true" },
          { input: "((((((((", expected: "false" },
          { input: "]", expected: "false" },
        ],
        time_limit: 1000,
        memory_limit: 128,
        locked: false,
      },
      {
        title: "Maximum Subarray",
        difficulty: "Medium",
        topic: "Dynamic Programming",
        description:
          "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
        input_format: "Space-separated integers",
        output_format: "An integer (the maximum subarray sum)",
        constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        examples: [
          {
            input: "-2 1 -3 4 -1 2 1 -5 4",
            output: "6",
            explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
          },
          { input: "1", output: "1" },
          { input: "5 4 -1 7 8", output: "23" },
        ],
        tags: ["dynamic-programming", "array", "divide-and-conquer"],
        starter_code: {
          JavaScript: "function maxSubArray(nums) {\n  // Your code here\n}",
          Python: "def max_sub_array(nums):\n    # Your code here\n    pass",
          "C++":
            "#include <vector>\nusing namespace std;\nint maxSubArray(vector<int>& nums) {\n    // Your code here\n}",
          Java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "-2 1 -3 4 -1 2 1 -5 4", expected: "6" },
          { input: "1", expected: "1" },
          { input: "5 4 -1 7 8", expected: "23" },
        ],
        hidden_testcases: [
          { input: "-1", expected: "-1" },
          { input: "-2 -1", expected: "-1" },
          { input: "0 0 0 0 0", expected: "0" },
          { input: "-1 -2 -3 -4", expected: "-1" },
          { input: "100 -1 100 -1 100", expected: "298" },
        ],
        time_limit: 2000,
        memory_limit: 256,
        locked: false,
      },
      {
        title: "Merge Sorted Arrays",
        difficulty: "Hard",
        topic: "Arrays",
        description:
          "You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in `nums1` and `nums2` respectively.\n\nMerge `nums2` into `nums1` as one sorted array. Return the merged sorted array.",
        input_format:
          "First line: space-separated integers (nums1)\nSecond line: space-separated integers (nums2)",
        output_format: "Space-separated integers (merged sorted array)",
        constraints: [
          "nums1.length == m + n",
          "nums2.length == n",
          "0 <= m, n <= 200",
        ],
        examples: [
          { input: "1 2 3\n2 5 6", output: "1 2 2 3 5 6" },
          { input: "1\n", output: "1" },
          { input: "4 5 6\n1 2 3", output: "1 2 3 4 5 6" },
        ],
        tags: ["array", "two-pointers", "sorting"],
        starter_code: {
          JavaScript: "function merge(nums1, nums2) {\n  // Your code here\n}",
          Python: "def merge(nums1, nums2):\n    # Your code here\n    pass",
          "C++":
            "#include <vector>\nusing namespace std;\nvector<int> merge(vector<int>& nums1, vector<int>& nums2) {\n    // Your code here\n}",
          Java: "class Solution {\n    public int[] merge(int[] nums1, int[] nums2) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "1 2 3\n2 5 6", expected: "1 2 2 3 5 6" },
          { input: "1\n", expected: "1" },
          { input: "4 5 6\n1 2 3", expected: "1 2 3 4 5 6" },
        ],
        hidden_testcases: [
          { input: "\n1", expected: "1" },
          { input: "0\n1", expected: "0 1" },
          { input: "1 1 1\n1 1 1", expected: "1 1 1 1 1 1" },
          { input: "-5 -3 0\n-4 -2 1", expected: "-5 -4 -3 -2 0 1" },
          { input: "1000000\n-1000000", expected: "-1000000 1000000" },
        ],
        time_limit: 2000,
        memory_limit: 256,
        locked: false,
      },
      {
        title: "Longest Common Subsequence",
        difficulty: "Hard",
        topic: "Dynamic Programming",
        description:
          "Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.\n\nA subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.",
        input_format: "First line: text1\nSecond line: text2",
        output_format: "An integer",
        constraints: [
          "1 <= text1.length, text2.length <= 1000",
          "text1 and text2 consist of only lowercase English characters.",
        ],
        examples: [
          {
            input: "abcde\nace",
            output: "3",
            explanation:
              "The longest common subsequence is 'ace' and its length is 3.",
          },
          { input: "abc\nabc", output: "3" },
          { input: "abc\ndef", output: "0" },
        ],
        tags: ["dynamic-programming", "string"],
        starter_code: {
          JavaScript:
            "function longestCommonSubsequence(text1, text2) {\n  // Your code here\n}",
          Python:
            "def longest_common_subsequence(text1, text2):\n    # Your code here\n    pass",
          "C++":
            "#include <string>\nusing namespace std;\nint longestCommonSubsequence(string text1, string text2) {\n    // Your code here\n}",
          Java: "class Solution {\n    public int longestCommonSubsequence(String text1, String text2) {\n        // Your code here\n    }\n}",
        },
        supported_languages: ["JavaScript", "Python", "C++", "Java"],
        testcases: [
          { input: "abcde\nace", expected: "3" },
          { input: "abc\nabc", expected: "3" },
          { input: "abc\ndef", expected: "0" },
        ],
        hidden_testcases: [
          { input: "bsbininm\njmjkbkjkv", expected: "1" },
          { input: "a\na", expected: "1" },
          { input: "a\nb", expected: "0" },
          { input: "abcba\nabcba", expected: "5" },
          { input: "oxcpqrsvwf\nshmtulqrypy", expected: "2" },
        ],
        time_limit: 3000,
        memory_limit: 256,
        locked: false,
      },
    ];

    for (const q of questions) {
      await ctx.db.insert("questions", {
        title: q.title,
        difficulty: q.difficulty,
        topic: q.topic,
        description: q.description,
        tags: q.tags,

        imageUrl: "",
        diagramUrl: "",
        voiceUrl: "",

        startercode_python: q.starter_code?.Python || "",
        startercode_javascript: q.starter_code?.JavaScript || "",
        startercode_java: q.starter_code?.Java || "",
        startercode_cpp: q.starter_code?.["C++"] || "",
        startercode_typescript: "",

        inputFormat: q.input_format,
        outputFormat: q.output_format,

        constraints: q.constraints,

        testCases: q.testcases.map((t: any) => ({
          input: t.input,
          expected: t.expected,
        })),

        hidden_testcases: q.hidden_testcases.map((t: any) => ({
          input: t.input,
          expected: t.expected,
        })),

        timeLimit: q.time_limit,

        penaltyInterval: undefined,
        penaltyDrop: undefined,

        locked: q.locked,
      });
    }

    return "Seeded " + questions.length + " questions";
  },
});

// Reset a stuck match back to waiting state
export const resetMatch = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.match_id, {
      status: "waiting",
    });
    return true;
  },
});
