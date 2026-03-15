import React, { useState, useEffect, useRef } from "react";
import {
  reviewCode,
  speakText,
  decodeAudioData,
  getHint,
  stripMarkdown,
} from "../services/geminiService";
import {
  Volume2,
  CheckCircle,
  Code,
  Terminal,
  Zap,
  BookOpen,
  X,
  Maximize2,
  GripHorizontal,
  ArrowRight,
  Trophy,
  Search,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Timer as TimerIcon,
  Infinity as InfinityIcon,
  Star,
  Loader2,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { CodeReview, Question, TestCase } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { AnimatedGlowButton } from "./custom-ui/animated-glow-button";

const extractUserCode = (fullCode: string): string => {
  const hasHarness = fullCode.includes('===== YOUR CODE BELOW =====');

  if (hasHarness) {
    const parts = fullCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }

  return fullCode.trim();
};

interface CodeIdeProps {
  question: Question;
  language: string;
  onBack: () => void;
  onComplete?: () => void;
  storageKey?: string;
  isCustomMode?: boolean;
}

const simpleFormat = (code: string | undefined | null) => {
  if (!code || typeof code !== "string")
    return "// Write your solution here...";
  if (code.includes("\n")) return code;
  return code
    .replace(/{/g, "{\n  ")
    .replace(/}/g, "\n}\n")
    .replace(/;/g, ";\n");
};

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};


// ========== JAVA SERIALIZATION ==========
const serializeJava = (val: any): string => {
  // Null/undefined
  if (val === null || val === undefined) return "null";

  // Arrays
  if (Array.isArray(val)) {
    if (val.length === 0) return "new int[]{}";

    const first = val[0];

    // --- 3D ARRAY ---
    if (Array.isArray(first) && first.length > 0 && Array.isArray(first[0])) {
      const deepFirst = first[0][0];

      if (typeof deepFirst === 'number') {
        const hasFloat = val.some((plane: any[][]) =>
          plane.some((row: any[]) =>
            row.some((n: any) => typeof n === 'number' && !Number.isInteger(n))
          )
        );

        if (hasFloat) {
          return `new double[][][]{${val.map((plane: any[][]) =>
            `{${plane.map((row: any[]) =>
              `{${row.map(n => Number.isInteger(n) ? `${n}.0` : n).join(", ")}}`
            ).join(", ")}}`
          ).join(", ")}}`;
        }

        return `new int[][][]{${val.map((plane: any[][]) =>
          `{${plane.map((row: any[]) =>
            `{${row.join(", ")}}`
          ).join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof deepFirst === 'string') {
        return `new String[][][]{${val.map((plane: any[][]) =>
          `{${plane.map((row: any[]) =>
            `{${row.map((v: string) => `"${v}"`).join(", ")}}`
          ).join(", ")}}`
        ).join(", ")}}`;
      }
    }

    // --- 2D ARRAY ---
    if (Array.isArray(first)) {
      if (first.length === 0) return "new int[][]{}";

      const innerFirst = first[0];

      if (typeof innerFirst === 'number') {
        const hasFloat = val.some((row: any[]) =>
          row.some((n: any) => typeof n === 'number' && !Number.isInteger(n))
        );

        if (hasFloat) {
          return `new double[][]{${val.map((row: any[]) =>
            `{${row.map(n => Number.isInteger(n) ? `${n}.0` : n).join(", ")}}`
          ).join(", ")}}`;
        }

        return `new int[][]{${val.map((row: any[]) =>
          `{${row.join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'string') {
        return `new String[][]{${val.map((row: any[]) =>
          `{${row.map((v: string) => `"${v}"`).join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'boolean') {
        return `new boolean[][]{${val.map((row: any[]) =>
          `{${row.join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'object' && innerFirst !== null) {
        return `new Object[][]{${val.map((row: any[]) =>
          `{${row.map((v: any) => serializeJava(v)).join(", ")}}`
        ).join(", ")}}`;
      }
    }

    // --- 1D ARRAY ---
    if (typeof first === 'string') {
      return `new String[]{${val.map((v: string) => `"${v.replace(/"/g, '\\"')}"`).join(", ")}}`;
    }

    if (typeof first === 'number') {
      const hasFloat = val.some((n: any) =>
        typeof n === 'number' && !Number.isInteger(n)
      );

      if (hasFloat) {
        return `new double[]{${val.map(n =>
          Number.isInteger(n) ? `${n}.0` : n
        ).join(", ")}}`;
      }

      return `new int[]{${val.join(", ")}}`;
    }

    if (typeof first === 'boolean') {
      return `new boolean[]{${val.join(", ")}}`;
    }

    if (typeof first === 'object' && first !== null) {
      return `new Object[]{${val.map((v: any) => serializeJava(v)).join(", ")}}`;
    }

    // Fallback for mixed or unknown types
    return `new Object[]{${val.map((v: any) => serializeJava(v)).join(", ")}}`;
  }

  // --- PRIMITIVES ---
  if (typeof val === 'string') {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  if (typeof val === 'boolean') {
    return val.toString();
  }

  if (typeof val === 'number') {
    return String(val);
  }

  // Objects (fallback)
  return String(val);
};

// ========== C++ SERIALIZATION ==========
const serializeCpp = (val: any): string => {
  // Null/undefined
  if (val === null || val === undefined) return "nullptr";

  // Arrays
  if (Array.isArray(val)) {
    if (val.length === 0) return "vector<int>{}";

    const first = val[0];

    // --- 3D VECTOR ---
    if (Array.isArray(first) && first.length > 0 && Array.isArray(first[0])) {
      const deepFirst = first[0][0];

      if (typeof deepFirst === 'number') {
        const hasFloat = val.some((plane: any[][]) =>
          plane.some((row: any[]) =>
            row.some((n: any) => typeof n === 'number' && !Number.isInteger(n))
          )
        );

        const type = hasFloat ? 'double' : 'int';
        return `vector<vector<vector<${type}>>>{${val.map((plane: any[][]) =>
          `{${plane.map((row: any[]) =>
            `{${row.join(", ")}}`
          ).join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof deepFirst === 'string') {
        return `vector<vector<vector<string>>>{${val.map((plane: any[][]) =>
          `{${plane.map((row: any[]) =>
            `{${row.map((v: string) => `"${v}"`).join(", ")}}`
          ).join(", ")}}`
        ).join(", ")}}`;
      }
    }

    // --- 2D VECTOR ---
    if (Array.isArray(first)) {
      if (first.length === 0) return "vector<vector<int>>{}";

      const innerFirst = first[0];

      if (typeof innerFirst === 'number') {
        const hasFloat = val.some((row: any[]) =>
          row.some((n: any) => typeof n === 'number' && !Number.isInteger(n))
        );

        const type = hasFloat ? 'double' : 'int';
        return `vector<vector<${type}>>{${val.map((row: any[]) =>
          `{${row.join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'string') {
        return `vector<vector<string>>{${val.map((row: any[]) =>
          `{${row.map((v: string) => `"${v}"`).join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'boolean') {
        return `vector<vector<bool>>{${val.map((row: any[]) =>
          `{${row.map((b: boolean) => b ? 'true' : 'false').join(", ")}}`
        ).join(", ")}}`;
      }

      if (typeof innerFirst === 'object' && innerFirst !== null && !Array.isArray(innerFirst)) {
        // Nested objects - fallback to int
        return `vector<vector<int>>{${val.map((row: any[]) =>
          `{${row.join(", ")}}`
        ).join(", ")}}`;
      }
    }

    // --- 1D VECTOR ---
    if (typeof first === 'string') {
      return `vector<string>{${val.map((v: string) =>
        `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      ).join(", ")}}`;
    }

    if (typeof first === 'number') {
      const hasFloat = val.some((n: any) =>
        typeof n === 'number' && !Number.isInteger(n)
      );

      const type = hasFloat ? 'double' : 'int';
      return `vector<${type}>{${val.join(", ")}}`;
    }

    if (typeof first === 'boolean') {
      return `vector<bool>{${val.map((b: boolean) => b ? 'true' : 'false').join(", ")}}`;
    }

    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      // Objects - fallback
      return `vector<int>{${val.join(", ")}}`;
    }

    // Fallback
    return `vector<int>{${val.join(", ")}}`;
  }

  // --- PRIMITIVES ---
  if (typeof val === 'string') {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (typeof val === 'number') {
    return String(val);
  }

  // Objects (fallback)
  return String(val);
};

const mergeImports = (harness: string[], user: string[]) => {
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, ' ');

  const hasUtilStar = user.some(
    i => normalize(i) === 'import java.util.*;'
  );

  if (hasUtilStar) {
    return [...user]; // wildcard already covers everything
  }

  const harnessSet = new Set(harness.map(normalize));

  const filteredUser = user.filter(
    i => !harnessSet.has(normalize(i))
  );

  return [...harness, ...filteredUser];
};

// Add this helper function in your component
const cleanDuplicateImports = (userCode: string, harnessImports: string[]): string => {
  const lines = userCode.split('\n');
  const cleanedLines: string[] = [];

  // Normalize harness imports for comparison (remove extra spaces)
  const normalizedHarness = harnessImports.map(imp =>
    imp.trim().replace(/\s+/g, ' ')
  );

  for (const line of lines) {
    const trimmed = line.trim();
    const normalized = trimmed.replace(/\s+/g, ' ');

    // Check if this line duplicates a harness import
    if (normalizedHarness.includes(normalized)) {
      continue; // Skip duplicate
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
};

// --- HARNESS GENERATORS ---
const generateJavaHarness = (userCode: string, testCases: TestCase[]) => {
  const hasHarness = userCode.includes('===== YOUR CODE BELOW =====');

  let cleanUserCode = userCode;
  if (hasHarness) {
    const parts = userCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      cleanUserCode = parts[1].trim();
    }
  }

  // Extract user imports from their code
  const userImports: string[] = [];
  const codeLines = cleanUserCode.split('\n');
  const nonImportLines: string[] = [];

  codeLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ')) {
      userImports.push(trimmed);
    } else if (!trimmed.startsWith('package ')) {
      // Keep everything except package declarations
      nonImportLines.push(line);
    }
  });

  const userCodeWithoutImports = nonImportLines.join('\n').trim();

  // Combine harness imports with user imports (remove duplicates)
  const harnessImports = [
    'import java.util.Arrays;',
    'import java.util.Objects;'
  ];

  const allImports = mergeImports(harnessImports, userImports);

  const calls = testCases.map((tc, i) => {
    const args = tc.input.map(v => serializeJava(v)).join(", ");
    const expected = serializeJava(tc.expected);

    return `
        try {
            System.out.print("> Test Case ${i + 1}: ");
            Object expected = ${expected};
            
            long startTime = System.nanoTime();
            Object result = s.solution(${args});
            long endTime = System.nanoTime();
            
            double durationMs = (endTime - startTime) / 1000000.0;
            String timeStr = durationMs < 0.1 ? "<0.1ms" : String.format("%.2fms", durationMs);
            
            boolean passed = deepEquals(expected, result);

            if (passed) {
                System.out.println("PASSED (" + timeStr + ")");
                System.out.println("  Input: " + formatArgs(${args}));
                System.out.println("  Result: " + formatResult(result));
            } else {
                System.out.println("FAILED (" + timeStr + ")");
                System.out.println("  Input: " + formatArgs(${args}));
                System.out.println("  Expected: " + formatResult(expected));
                System.out.println("  Actual: " + formatResult(result));
            }
        } catch (Exception e) {
            System.out.println("ERROR");
            System.out.println("  " + e.toString());
        }
        System.out.println("");
      `;
  }).join("\n");

  return `//#region TEST HARNESS - DO NOT MODIFY
// ============================================================
// TEST HARNESS - DO NOT MODIFY THIS SECTION
// Click the arrow (▼) on the left to collapse this section
// ============================================================
${allImports.join('\n')}

public class Main {
    public static void main(String[] args) {
        Solution s = new Solution();
        ${calls}
    }

    public static boolean deepEquals(Object expected, Object actual) {
        if (expected == null && actual == null) return true;
        if (expected == null || actual == null) return false;
        if (expected.equals(actual)) return true;
        
        if (expected instanceof int[] && actual instanceof int[]) return Arrays.equals((int[])expected, (int[])actual);
        if (expected instanceof double[] && actual instanceof double[]) return Arrays.equals((double[])expected, (double[])actual);
        if (expected instanceof long[] && actual instanceof long[]) return Arrays.equals((long[])expected, (long[])actual);
        if (expected instanceof String[] && actual instanceof String[]) return Arrays.equals((String[])expected, (String[])actual);
        if (expected instanceof boolean[] && actual instanceof boolean[]) return Arrays.equals((boolean[])expected, (boolean[])actual);
        if (expected instanceof int[][] && actual instanceof int[][]) return Arrays.deepEquals((int[][])expected, (int[][])actual);
        if (expected instanceof double[][] && actual instanceof double[][]) return Arrays.deepEquals((double[][])expected, (double[][])actual);
        if (expected instanceof String[][] && actual instanceof String[][]) return Arrays.deepEquals((String[][])expected, (String[][])actual);
        if (expected instanceof Object[] && actual instanceof Object[]) return Arrays.deepEquals((Object[])expected, (Object[])actual);
        
        return false;
    }

    public static String formatResult(Object o) {
        if (o == null) return "null";
        if (o instanceof int[]) return Arrays.toString((int[])o);
        if (o instanceof double[]) return Arrays.toString((double[])o);
        if (o instanceof long[]) return Arrays.toString((long[])o);
        if (o instanceof String[]) return Arrays.toString((String[])o);
        if (o instanceof boolean[]) return Arrays.toString((boolean[])o);
        if (o instanceof int[][]) return Arrays.deepToString((int[][])o);
        if (o instanceof double[][]) return Arrays.deepToString((double[][])o);
        if (o instanceof String[][]) return Arrays.deepToString((String[][])o);
        if (o instanceof Object[]) return Arrays.deepToString((Object[])o);
        return String.valueOf(o);
    }
    
    public static String formatArgs(Object... args) {
        if (args == null) return "";
        String s = Arrays.deepToString(args);
        return s.substring(1, s.length() - 1); // Strip outer brackets
    }
}
//#endregion

// ============================================================
// ===== YOUR CODE BELOW - ADD YOUR IMPORTS AND SOLUTION =====
// ============================================================
// 💡 TIP: Need ArrayList, HashMap, etc.? Add: import java.util.*;
// 💡 TIP: Need Collections utilities? Add: import java.util.Collections;
// 📝 NOTE: Your imports will be automatically moved to the top of the file

${userCodeWithoutImports}
`;
};

const generateCppHarness = (userCode: string, testCases: TestCase[]) => {
  const hasHarness = userCode.includes('===== YOUR CODE BELOW =====');

  let cleanUserCode = userCode;
  if (hasHarness) {
    const parts = userCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      cleanUserCode = parts[1].trim();
    }
  }

  // Extract user includes from their code
  const userIncludes: string[] = [];
  const codeLines = cleanUserCode.split('\n');
  const nonIncludeLines: string[] = [];

  codeLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#include ')) {
      userIncludes.push(trimmed);
    } else {
      nonIncludeLines.push(line);
    }
  });

  const userCodeWithoutIncludes = nonIncludeLines.join('\n').trim();

  // Combine harness includes with user includes (remove duplicates)
  const harnessIncludes = [
    '#include <iostream>',
    '#include <vector>',
    '#include <string>',
    '#include <chrono>',
    '#include <iomanip>'
  ];

  const allIncludes = mergeImports(harnessIncludes, userIncludes);

  const calls = testCases.map((tc, i) => {
    const declarations = tc.input.map((v, idx) => `auto arg${idx} = ${serializeCpp(v)};`).join('\n            ');
    const argsList = tc.input.map((_, idx) => `arg${idx}`).join(", ");
    const printInputs = tc.input.map((_, idx) => {
       const isLast = idx === tc.input.length - 1;
       return `printResult(arg${idx});${!isLast ? ' cout << ", ";' : ''}`;
    }).join('\n                ');
    const expected = serializeCpp(tc.expected);

    return `
        {
            cout << "> Test Case ${i + 1}: ";
            ${declarations}
            auto expected = ${expected};
            
            auto start = chrono::high_resolution_clock::now();
            auto result = s.solution(${argsList});
            auto end = chrono::high_resolution_clock::now();
            
            auto duration = chrono::duration_cast<chrono::microseconds>(end - start).count();
            double ms = duration / 1000.0;

            if (result == expected) {
                cout << "PASSED";
                if (ms < 0.1) cout << " (<0.1ms)" << endl;
                else {
                    cout.precision(2);
                    cout << fixed << " (" << ms << "ms)" << endl;
                }
                cout << "  Input: ";
                ${printInputs}
                cout << endl;
                cout << "  Result: "; printResult(result); cout << endl;
            } else {
                cout << "FAILED";
                if (ms < 0.1) cout << " (<0.1ms)" << endl;
                else {
                    cout.precision(2);
                    cout << fixed << " (" << ms << "ms)" << endl;
                }
                cout << "  Input: ";
                ${printInputs}
                cout << endl;
                cout << "  Expected: "; printResult(expected); cout << endl;
                cout << "  Actual: "; printResult(result); cout << endl;
            }
            cout << endl;
        }
        `;
  }).join("\n");

  return `//#region TEST HARNESS - DO NOT MODIFY
// ============================================================
// TEST HARNESS - DO NOT MODIFY THIS SECTION
// Click the arrow (▼) on the left to collapse this section
// ============================================================
${allIncludes.join('\n')}

using namespace std;

// Forward declarations for proper overload resolution
template <typename T> void printResult(const T& x);
void printResult(const string& s);
void printResult(const char* s);
void printResult(bool b);
template <typename T> void printResult(const vector<T>& v);
template <typename T> void printResult(const vector<vector<T>>& v);
template <typename T> void printResult(const vector<vector<vector<T>>>& v);

void printResult(const string& s) {
    cout << "\\"" << s << "\\"";
}

void printResult(const char* s) {
    cout << "\\"" << s << "\\"";
}

void printResult(bool b) {
    cout << (b ? "true" : "false");
}

template <typename T>
void printResult(const T& x) {
    cout << x;
}

template <typename T>
void printResult(const vector<T>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        printResult(v[i]);
        if (i < v.size() - 1) cout << ", ";
    }
    cout << "]";
}

template <typename T>
void printResult(const vector<vector<T>>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        printResult(v[i]);
        if (i < v.size() - 1) cout << ", ";
    }
    cout << "]";
}

template <typename T>
void printResult(const vector<vector<vector<T>>>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        printResult(v[i]);
        if (i < v.size() - 1) cout << ", ";
    }
    cout << "]";
}
//#endregion

// ============================================================
// ===== YOUR CODE BELOW - ADD YOUR INCLUDES AND SOLUTION =====
// ============================================================
// 💡 TIP: Need algorithms? Add: #include <algorithm>
// 💡 TIP: Need maps/sets? Add: #include <map> or #include <set>
// 📝 NOTE: Your includes will be automatically moved to the top of the file

${userCodeWithoutIncludes}

int main() {
    Solution s;
    ${calls}
    return 0;
}
`;
};

const generatePythonHarness = (userCode: string, testCases: TestCase[]) => {
  const hasHarness = userCode.includes('===== YOUR CODE BELOW =====');

  let cleanUserCode = userCode;
  if (hasHarness) {
    const parts = userCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      cleanUserCode = parts[1].trim();
    }
  }

  // Extract user imports from their code
  const userImports: string[] = [];
  const codeLines = cleanUserCode.split('\n');
  const nonImportLines: string[] = [];

  codeLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      userImports.push(trimmed);
    } else {
      nonImportLines.push(line);
    }
  });

  const userCodeWithoutImports = nonImportLines.join('\n').trim();

  // Combine harness imports with user imports (remove duplicates)
  const harnessImports = [
    'import json',
    'import time',
    'from typing import Any'
  ];

  const allImports = mergeImports(harnessImports, userImports);

  const calls = testCases.map((tc, i) => {
    const inputJson = JSON.stringify(tc.input)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    const expectedJson = JSON.stringify(tc.expected)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return `
    try:
        start_time = time.time()
        args = json.loads('${inputJson}')
        expected = json.loads('${expectedJson}')
        
        result = solution(*args)
        
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        time_str = f"{duration_ms:.2f}ms" if duration_ms >= 0.1 else "<0.1ms"
        
        is_passed = deep_equal(result, expected)
        status = "PASSED" if is_passed else "FAILED"
        
        print(f"> Test Case ${i + 1}: {status} ({time_str})")
        
        # Format input args to remove outer brackets
        input_str = ", ".join(json.dumps(a) for a in args)

        if is_passed:
            print(f"  Input: {input_str}")
            print(f"  Result: {json.dumps(result)}")
        else:
            print(f"  Input: {input_str}")
            print(f"  Expected: {json.dumps(expected)}")
            print(f"  Actual: {json.dumps(result)}")

    except Exception as e:
        print(f"> Test Case ${i + 1}: ERROR")
        print(f"  {type(e).__name__}: {e}")
    
    print("")
`;
  }).join("\n");

  return `# region TEST HARNESS - DO NOT MODIFY
# ============================================================
# TEST HARNESS - DO NOT MODIFY THIS SECTION
# Click the arrow (▼) on the left to collapse this section
# ============================================================
${allImports.join('\n')}

def deep_equal(a: Any, b: Any) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    
    if type(a) != type(b):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return abs(a - b) < 1e-9
        return False
    
    if isinstance(a, (bool, int, float, str)):
        if isinstance(a, float) and isinstance(b, float):
            return abs(a - b) < 1e-9
        return a == b
    
    if isinstance(a, (list, tuple)):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))
    
    if isinstance(a, set):
        return a == b
    
    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a.keys())
    
    return a == b
# endregion

# ============================================================
# ===== YOUR CODE BELOW - ADD YOUR IMPORTS AND SOLUTION =====
# ============================================================
# 💡 TIP: Need math functions? Add: import math
# 💡 TIP: Need collections? Add: from collections import deque, Counter
# 📝 NOTE: Your imports will be automatically moved to the top of the file

${userCodeWithoutImports}

if __name__ == "__main__":
${calls}
`;
};

const generateTSHarness = (userCode: string, testCases: TestCase[]) => {
  const hasHarness = userCode.includes('===== YOUR CODE BELOW =====');

  let cleanUserCode = userCode;
  if (hasHarness) {
    const parts = userCode.split('===== YOUR CODE BELOW =====');
    if (parts.length > 1) {
      cleanUserCode = parts[1].trim();
    }
  }

  const calls = testCases.map((tc, i) => {
    const args = JSON.stringify(tc.input);
    const expected = JSON.stringify(tc.expected);
    return `
      try {
          const args = ${args};
          const expected = ${expected};
          const start = performance.now();
          // @ts-ignore
          const result = solution(...args);
          const end = performance.now();
          
          const passed = deepEqual(result, expected);
          const duration = end - start;
          const timeStr = duration < 0.1 ? "<0.1ms" : duration.toFixed(2) + "ms";
          
          // Format input args to remove outer brackets
          const inputStr = args.map(a => JSON.stringify(a)).join(', ');

          if (passed) {
             console.log(\`> Test Case ${i + 1}: PASSED (\${timeStr})\`);
             console.log(\`  Input: \${inputStr}\`);
             console.log(\`  Result: \${JSON.stringify(result)}\`);
          } else {
             console.log(\`> Test Case ${i + 1}: FAILED (\${timeStr})\`);
             console.log(\`  Input: \${inputStr}\`);
             console.log(\`  Expected: \${JSON.stringify(expected)}\`);
             console.log(\`  Actual: \${JSON.stringify(result)}\`);
          }
      } catch (e) {
          console.log(\`> Test Case ${i + 1}: ERROR\`);
          console.log(\`  \${e}\`);
      }
      console.log("");
      `;
  }).join("\n");

  return `
/// <reference lib="es2015" />
/// <reference lib="es2016" />
/// <reference lib="dom" />

//#region TEST HARNESS - DO NOT MODIFY
// ============================================================
// TEST HARNESS - DO NOT MODIFY THIS SECTION
// Click the arrow (▼) on the left to collapse this section
// ============================================================
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
//#endregion

// ============================================================
// ===== YOUR CODE BELOW - ADD YOUR SOLUTION =====
// ============================================================
// 💡 TIP: This is TypeScript - use type annotations for better code!

${cleanUserCode}

async function runTests() {
  ${calls}
}

runTests().catch(err => console.error("Test runner error:", err));
`;
};

export default function CodeIde({
  question,
  language,
  onBack,
  onComplete,
  storageKey,
  isCustomMode,
}: CodeIdeProps) {
  // State
  const [code, setCode] = useState(simpleFormat(question?.starterCode));
  const [consoleOutput, setConsoleOutput] = useState<string>(
    "// Console ready...",
  );
  const [review, setReview] = useState<CodeReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);

  // Audio State
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const editorRef = useRef<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"problem" | "review">("problem");

  // Sandbox state no longer needed (instantly created on run)
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Submission Stats
  const [submissionStats, setSubmissionStats] = useState<{
    finalScore: number;
    rawEfficiency: number;
    timePenalty: number;
    linesOfCode: number;
    timeTakenFormatted: string;
  } | null>(null);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(
    question.timeLimit * 60,
  );
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Image Viewer State
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  const [consoleHeight, setConsoleHeight] = useState(250);
  const [showProblem, setShowProblem] = useState(true);
  const [showConsole, setShowConsole] = useState(true);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Background Audio Generation & Fetching
  useEffect(() => {
    let isMounted = true;
    const initAudio = async () => {
      if (audioBufferRef.current) return;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioCtxRef.current;

        if (question.voiceUrl) {
          const res = await fetch(question.voiceUrl);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          if (isMounted) audioBufferRef.current = buffer;
        } else if (question.dbId) {
          const textToSpeak = `${question.title}. ${question.description}`;
          const res = await fetch("/api/gemini/generate-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              text: textToSpeak, 
              questionId: question.dbId, 
              isAiMl: false 
            })
          });
          const data = await res.json();
          if (data.base64Audio && isMounted) {
            const binaryString = atob(data.base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const buffer = await decodeAudioData(bytes, ctx);
            if (isMounted) audioBufferRef.current = buffer;
          }
        }
      } catch (err) {
        console.error("Background voice prep failed", err);
      }
    };

    initAudio();

    return () => { isMounted = false; };
  }, [question]);

  // Persistence
  useEffect(() => {
    setCode(simpleFormat(question?.starterCode));
  }, [question]);

  // Timer Effect
  useEffect(() => {
    if (!timerActive) return;
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      if (question.timeLimit > 0) {
        if (secondsRemaining > 0) {
          setSecondsRemaining((prev) => prev - 1);
        } else {
          setOvertimeSeconds((prev) => prev + 1);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, secondsRemaining, question.timeLimit]);

  // --- EXECUTION ENGINE ---
  const runCode = async () => {
    if (!question.testCases || question.testCases.length === 0) {
      setConsoleOutput("> Error: No test cases found in question definition.\n");
      return;
    }

    setShowConsole(true);
    setConsoleOutput("> Running code...\n");
    setIsRunning(true);

    // Give React a moment to render the loading state
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      let outputLog = "";
      let passedCount = 0;

      // --- 1. LOCAL BROWSER EXECUTION (Only JavaScript) ---
      if (language === "JavaScript") {
        const wrapper = `
          ${code}
          // Attempt to locate solution
          try { if (typeof solution === 'function') return solution; } catch(e) {}
          try { return this.solution || window.solution; } catch(e) {}
          return null;
        `;

        let userFn;
        try {
          userFn = new Function(wrapper)();
        } catch (e: any) {
          throw new Error("Syntax Error: " + e.message);
        }

        if (typeof userFn !== "function") {
          throw new Error("Could not find function 'solution'. Ensure you define 'function solution()' or 'const solution = ...'");
        }

        question.testCases.forEach((tc, idx) => {
          try {
            const args = JSON.parse(JSON.stringify(tc.input));
            const start = performance.now();
            const result = userFn(...args);
            const duration = performance.now() - start;
            const timeStr = duration < 0.1 ? "<0.1ms" : duration.toFixed(2) + "ms";

            const resultStr = JSON.stringify(result);
            const expectedStr = JSON.stringify(tc.expected);

            // Format args to remove outer brackets for display
            const inputStr = tc.input.map(arg => JSON.stringify(arg)).join(', ');

            if (resultStr === expectedStr) {
              passedCount++;
              outputLog += `> Test Case ${idx + 1}: PASSED (${timeStr})\n`;
              outputLog += `  Input: ${inputStr}\n`;
              outputLog += `  Result: ${resultStr}\n`;
            } else {
              outputLog += `> Test Case ${idx + 1}: FAILED (${timeStr})\n`;
              outputLog += `  Input: ${inputStr}\n`;
              outputLog += `  Expected: ${expectedStr}\n`;
              outputLog += `  Actual: ${resultStr}\n`;
            }
          } catch (e: any) {
            outputLog += `> Test Case ${idx + 1}: ERROR\n  ${e.message}\n`;
          }
          outputLog += "\n";
        });

        setConsoleOutput(outputLog);
        setConsoleOutput(prev => prev + `> Summary: ${passedCount}/${question.testCases?.length} Tests Passed.\n`);
        if (passedCount === question.testCases?.length) {
          setConsoleOutput(prev => prev + "> [SUCCESS] All local tests passed!\n");
        }

      }

      // --- 2. REMOTE E2B SANDBOX (Python, Java, C++, TypeScript) ---
      else {
        let sourceFile = code;
        let languageKey = language.toLowerCase();
        let fileName = "main.txt";

        // Select Harness and Configuration
        if (language === "Java") {
          sourceFile = generateJavaHarness(code, question.testCases);
          languageKey = "java";
          fileName = "Main.java";
        } else if (language === "C++") {
          sourceFile = generateCppHarness(code, question.testCases);
          languageKey = "cpp";
          fileName = "main.cpp";
        } else if (language === "Python") {
          sourceFile = generatePythonHarness(code, question.testCases);
          languageKey = "python";
          fileName = "main.py";
        } else if (language === "TypeScript") {
          sourceFile = generateTSHarness(code, question.testCases);
          languageKey = "typescript";
          fileName = "index.ts";
        }

        const response = await fetch('/api/execute', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: languageKey,
            code: sourceFile
          })
        });

        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.message || "Execution failed");
        }

        const data = await response.json();

        if (data.run) {
          const rawOutput = data.run.stdout + data.run.stderr;
          outputLog = rawOutput;

          const passedMatches = (rawOutput.match(/> Test Case \d+: PASSED/g) || []).length;
          passedCount = passedMatches;

          setConsoleOutput(outputLog);

          if (data.run.code !== 0) {
            setConsoleOutput(prev => prev + `\n> Sandbox Execution Error (Exit Code: ${data.run.code})\n`);
          } else {
            setConsoleOutput(prev => prev + `\n> Summary: ${passedCount}/${question.testCases?.length} Tests Passed.\n`);
            if (passedCount === question.testCases?.length) {
              setConsoleOutput(prev => prev + "> [SUCCESS] All local tests passed!\n");
            }
          }

        } else {
          setConsoleOutput(`> Error: Failed to connect to Sandbox.\n> Message: Unknown error structure`);
        }
      }

    } catch (e: any) {
      setConsoleOutput((prev) => prev + `> Runtime Error:\n${e.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setTimerActive(false);
    try {
      // Extract only user code (remove harness) before sending for review
      const userCodeOnly = extractUserCode(code);

      const result = await reviewCode(userCodeOnly, question, language);
      const rawEfficiency = result.score;
      let calculatedPenalty = 0;

      if (
        question.timeLimit > 0 &&
        overtimeSeconds > 0 &&
        question.penaltyInterval > 0
      ) {
        const penaltyIntervals = Math.floor(
          overtimeSeconds / question.penaltyInterval,
        );
        calculatedPenalty = penaltyIntervals * question.penaltyDrop;
      }

      const finalScore = Math.max(0, rawEfficiency - calculatedPenalty);

      // Count only user code lines (not harness)
      const linesOfCode = userCodeOnly.split("\n").filter((line) => line.trim().length > 0).length;

      setSubmissionStats({
        finalScore,
        rawEfficiency,
        timePenalty: calculatedPenalty,
        linesOfCode,
        timeTakenFormatted: formatTime(elapsedTime),
      });

      setReview(result);
      setShowSuccessModal(true);

      if (finalScore < 70) {
        setActiveTab("review");
        setShowProblem(true);
      }
    } catch (error) {
      setConsoleOutput(
        (prev) => prev + "\n> AI Analysis Failed. Please try again.",
      );
      setTimerActive(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHint = async () => {
    setIsGettingHint(true);
    setShowConsole(true);
    setConsoleOutput(
      (prev) => prev + "\n> AI is analyzing your code and constraints...",
    );
    try {
      const userCodeOnly = extractUserCode(code);
      const hint = await getHint(userCodeOnly, question, language);
      setConsoleOutput((prev) => prev + `\n> AI HINT: ${hint}\n`);
    } catch (e) {
      setConsoleOutput(
        (prev) => prev + `\n> Error: Could not retrieve hint.\n`,
      );
    } finally {
      setIsGettingHint(false);
    }
  };

  const handleManualReview = async () => {
    setIsReviewing(true);
    try {
      const userCodeOnly = extractUserCode(code);
      const result = await reviewCode(userCodeOnly, question, language);
      setReview(result);
    } catch (error) {
      setConsoleOutput(
        (prev) => prev + "\n> AI Review Failed. Please try again.",
      );
    } finally {
      setIsReviewing(false);
    }
  };

  const handleNext = () => {
    setShowSuccessModal(false);
    if (onComplete) onComplete();
    else onBack();
  };

  const handleSpeak = async () => {
    if (isAudioLoading) return;

    // Initialize Context if needed
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const ctx = audioCtxRef.current;

    // Case 1: Playing -> Pause
    if (isPlayingAudio) {
      if (ctx.state === 'running') {
        await ctx.suspend();
        setIsPlayingAudio(false);
      }
      return;
    }

    // Case 2: Paused -> Resume
    if (ctx.state === 'suspended' && audioBufferRef.current) {
      await ctx.resume();
      setIsPlayingAudio(true);
      return;
    }

    // Case 3: Stopped/Finished/Empty -> Start
    try {
      // Check buffer
      if (!audioBufferRef.current) {
        setIsAudioLoading(true);
        const textToSpeak = `${question.title}. ${question.description}`;
        
        if (question.voiceUrl) {
          const res = await fetch(question.voiceUrl);
          const arrayBuffer = await res.arrayBuffer();
          audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
        } else {
          // Fallback if background task didn't finish
          const audioBytes = await speakText(textToSpeak);
          audioBufferRef.current = await decodeAudioData(audioBytes, ctx);
        }
        setIsAudioLoading(false);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current!;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start(0);
      setIsPlayingAudio(true);
    } catch (e) {
      console.error("Audio playback error", e);
      setIsAudioLoading(false);
      setIsPlayingAudio(false);
    }
  };

  const openImageViewer = (url: string) => {
    setViewImage(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const closeImageViewer = () => setViewImage(null);
  const handleImageDoubleTap = () => {
    setZoom((prev) => (prev === 1 ? 2.5 : 1));
    setPan({ x: 0, y: 0 });
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleDragLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const newWidth = (moveEvent.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleDragConsole = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = consoleHeight;
    const handleMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = startHeight + delta;
      if (newHeight > 50 && newHeight < window.innerHeight * 0.6) {
        setConsoleHeight(newHeight);
      }
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const getMonacoLanguage = (lang: string) => {
    const normalized = lang.toLowerCase();
    switch (normalized) {
      case "c++": return "cpp";
      case "python": return "python";
      case "java": return "java";
      case "typescript": return "typescript";
      case "c#": return "csharp";
      default: return "javascript";
    }
  };

  const isSuccess = submissionStats && submissionStats.finalScore >= 70;

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative">
      {/* Fullscreen Image Viewer Modal */}
      {viewImage && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex gap-4 z-50">
            <div className="flex bg-neutral-800 rounded-lg p-1">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="p-2 hover:bg-neutral-700 rounded transition"><ZoomOut size={20} /></button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 hover:bg-neutral-700 rounded transition"><RotateCcw size={20} /></button>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="p-2 hover:bg-neutral-700 rounded transition"><ZoomIn size={20} /></button>
            </div>
            <button onClick={closeImageViewer} className="p-3 bg-neutral-800 rounded-full hover:bg-red-600 transition"><X size={24} /></button>
          </div>
          <div
            className={`w-full h-full flex items-center justify-center overflow-hidden ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
            onDoubleClick={handleImageDoubleTap}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img src={viewImage} alt="Full View" className="max-w-[90%] max-h-[90%] object-contain transition-transform duration-200 ease-out select-none" draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          </div>
        </div>
      )}

      {/* Success/Result Modal */}
      {showSuccessModal && review && submissionStats && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isSuccess ? "from-green-500 to-blue-500" : "from-red-500 to-orange-500"}`}></div>
            <div className="text-center mb-6">
              <div className={`animate-bounce-slow inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border ${isSuccess ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                {isSuccess ? <Trophy size={40} /> : <AlertTriangle size={40} />}
              </div>
              <h2 className="text-4xl font-black text-white mb-2">{isSuccess ? "Level Complete!" : "Analysis Complete"}</h2>
              <p className="text-neutral-400">{isSuccess ? "You've mastered this challenge." : "Score below threshold. Review the feedback."}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 rounded-xl border border-neutral-700 text-center col-span-2 md:col-span-1 flex flex-col justify-center">
                <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1 tracking-wider">Success Score</div>
                <div className={`text-3xl font-black ${isSuccess ? "text-white" : "text-red-400"}`}>{submissionStats.finalScore}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Code Efficiency</div>
                <div className="text-xl font-bold text-blue-400">{submissionStats.rawEfficiency}%</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Time Taken</div>
                <div className={`text-sm font-bold ${submissionStats.timePenalty > 0 ? "text-red-400" : "text-green-400"}`}>{submissionStats.timeTakenFormatted}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-neutral-800 text-center flex flex-col justify-center">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Conciseness</div>
                <div className="text-lg font-bold text-neutral-300">{submissionStats.linesOfCode} <span className="text-[10px] font-normal text-neutral-500">LOC</span></div>
              </div>
            </div>

            {/* Key Takeaway */}
            <div className="bg-neutral-950/50 rounded-xl border border-neutral-800 p-4 mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase mb-2">
                <CheckCircle size={14} className={isSuccess ? "text-green-500" : "text-yellow-500"} /> Key Takeaway
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed">
                {review.keyTakeaway}
              </p>
            </div>

            {/* What You Learned */}
            <div className="bg-neutral-800/20 rounded-xl p-5 border border-neutral-800/50 mb-8">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Star size={14} className="text-yellow-400" /> What You Learned
              </h3>
              <div className="flex flex-wrap gap-2">
                {review.skillsLearned?.map((skill, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs border ${i % 2 === 0
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                    : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    }`}>
                    {skill}
                  </span>
                )) || <span className="text-neutral-500 text-xs">Analysis incomplete</span>}
                <span className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded-full text-xs border border-neutral-700">{language}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowSuccessModal(false)} className="flex-1 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition">Review Code</button>
              {isSuccess ? (
                <button onClick={handleNext} className="flex-[2] py-4 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 transition flex items-center justify-center gap-2">
                  {isCustomMode ? "Next Challenge" : "Continue Journey"} <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={() => setShowSuccessModal(false)} className="flex-[2] py-4 bg-red-600/20 text-red-200 border border-red-500/30 rounded-xl font-bold hover:bg-red-600/30 transition flex items-center justify-center gap-2">
                  Try Again <RotateCcw size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-neutral-400 hover:text-white transition">← Back</button>
          <span className="font-mono text-sm bg-neutral-800 px-2 py-1 rounded text-blue-400 border border-neutral-700">{language}</span>
          <div className="flex items-center gap-4">
            <h1 className="font-bold truncate max-w-xs md:max-w-md border-r border-neutral-700 pr-4">{question?.title || "Loading..."}</h1>
            <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1 rounded border ${secondsRemaining === 0 && question.timeLimit > 0 ? "bg-red-900/30 border-red-500/30 text-red-400 animate-pulse" : "bg-neutral-800 border-neutral-700 text-green-400"}`}>
              <TimerIcon size={14} />
              {question.timeLimit === 0 ? <span>{formatTime(elapsedTime)}</span> : (secondsRemaining > 0 ? <span>{formatTime(secondsRemaining)}</span> : <span>-{formatTime(overtimeSeconds)}</span>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowProblem(!showProblem)} className={`p-2 rounded hover:bg-neutral-800 transition ${!showProblem ? "text-blue-400" : "text-neutral-400"}`} title="Toggle Problem Panel"><BookOpen size={18} /></button>
          <button onClick={() => setShowConsole(!showConsole)} className={`p-2 rounded hover:bg-neutral-800 transition ${!showConsole ? "text-green-400" : "text-neutral-400"}`} title="Toggle Console"><Terminal size={18} /></button>
          <div className="w-px h-6 bg-neutral-700 mx-2 self-center"></div>
          <button onClick={runCode} disabled={isRunning} className="flex items-center gap-2 px-6 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-sm font-bold transition text-white border border-neutral-700 disabled:opacity-50">
            {isRunning ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : "Run"}
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting || isReviewing} className="flex items-center gap-2 px-6 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-bold transition disabled:opacity-50 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]">
            {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />} Submit
          </button>
          <AnimatedGlowButton
            onClick={handleHint}
            disabled={isReviewing || isSubmitting}
            state={isGettingHint ? "loading" : "idle"}
            mode="loading"
            containerClassName={`
    px-3 py-1.5 text-sm rounded-lg border border-white/10
    bg-white/5 backdrop-blur
    text-neutral-400 hover:text-white
    ${isGettingHint ? "animate-pulse" : ""}
  `}
          >
            <Zap size={16} />
          </AnimatedGlowButton>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {showProblem && question && (
          <div className="flex flex-col border-r border-neutral-800 bg-neutral-900/30" style={{ width: `${leftPanelWidth}%` }}>
            <div className="flex border-b border-neutral-800">
              <button onClick={() => setActiveTab("problem")} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "problem" ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/10" : "text-neutral-400 hover:bg-neutral-800"}`}>Problem</button>
              <button onClick={() => setActiveTab("review")} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "review" ? "border-b-2 border-purple-500 text-purple-400 bg-purple-500/10" : "text-neutral-400 hover:bg-neutral-800"}`}>AI Review</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
              {activeTab === "problem" ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold">{question.title}</h2>
                    <button
                      onClick={handleSpeak}
                      disabled={isAudioLoading}
                      className={`p-2 rounded-full transition ${isPlayingAudio
                        ? "bg-blue-500/20 text-blue-400 animate-pulse border border-blue-500/30"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                    >
                      {isAudioLoading ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                    </button>
                  </div>
                  {question.imageUrl && <div className="relative group rounded-xl w-full"><img src={question.imageUrl} alt="Concept Art" className="w-full h-64 object-cover" /></div>}
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-neutral-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ className, children, ...props }) {
                          return (
                            <code
                              className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {question.description}
                    </ReactMarkdown>

                    {question.diagramUrl && (
                      <div
                        className="relative group rounded-xl overflow-hidden border border-neutral-700 bg-black/40 w-full my-6 cursor-zoom-in hover:border-neutral-500 transition-all"
                        onClick={() => openImageViewer(question.diagramUrl!)}
                      >
                        <img
                          src={question.diagramUrl}
                          alt="Structure Diagram"
                          className="w-full h-64 object-contain bg-white/5 p-4"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="text-white drop-shadow-md" size={32} />
                        </div>
                      </div>
                    )}

                    <h3 className="text-base font-semibold text-white mt-6">Formats</h3>

                    <div className="bg-neutral-800/50 p-3 rounded border border-neutral-700 font-mono text-xs">
                      <div>
                        <span className="text-blue-400">In:</span>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p({ children }) {
                              return <span>{children}</span>;
                            },
                            code({ className, children, ...props }) {
                              return (
                                <code
                                  className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {question.inputFormat}
                        </ReactMarkdown>
                      </div>

                      <div className="mt-1">
                        <span className="text-green-400">Out:</span>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p({ children }) {
                              return <span>{children}</span>;
                            },
                            code({ className, children, ...props }) {
                              return (
                                <code
                                  className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {question.outputFormat}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-white mt-4">Constraints</h3>

                    <ul className="list-disc pl-5 text-neutral-400 text-xs">
                      {question.constraints &&
                        question.constraints.map((c, i) => (
                          <li key={i}>
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                code({ className, children, ...props }) {
                                  return (
                                    <code
                                      className={`${className} bg-neutral-800 px-1 py-0.5 rounded text-blue-300`}
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {c}
                            </ReactMarkdown>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center mb-6"><button onClick={handleManualReview} disabled={isReviewing} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50">{isReviewing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Search size={18} />}{review ? "Re-Analyze Code" : "Analyze Code"}</button></div>
                  <div className="flex items-center gap-4 bg-neutral-800/30 p-4 rounded-xl border border-neutral-800"><div className={`text-4xl font-black ${review ? (review.score > 80 ? "text-green-400" : review.score > 50 ? "text-yellow-400" : "text-red-400") : "text-neutral-600"}`}>{review ? review.score : "0"}</div><div className="flex-1"><div className="flex justify-between text-xs text-neutral-400 mb-1"><span>Code Efficiency Score</span><span>{review ? `${review.score}/100` : "-"}</span></div><div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${review && review.score > 80 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: review ? `${review.score}%` : "0%" }} /></div></div></div>
                  <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20"><h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2 text-sm"><CheckCircle size={14} /> Feedback</h3><p className="text-blue-100 text-xs leading-relaxed">{review ? stripMarkdown(review.feedback) : "Click 'Analyze Code' to get AI feedback."}</p></div>
                  <div className="space-y-4"><h3 className="font-bold text-white flex items-center gap-2 text-sm"><Code size={14} /> Recommended Changes</h3>{review && review.changes && review.changes.length > 0 ? (review.changes.map((change, idx) => (<div key={idx} className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden flex flex-col"><div className="bg-neutral-800 px-3 py-2 text-xs text-neutral-300 font-medium flex gap-2 items-center"><AlertTriangle size={12} className="text-yellow-500" />{change.explanation}</div><div className="grid grid-cols-1 md:grid-cols-2 text-[10px] md:text-xs font-mono"><div className="bg-red-900/20 p-3 border-r border-neutral-800"><div className="text-red-400 mb-1 uppercase text-[9px] font-bold tracking-wider">Original</div><pre className="whitespace-pre-wrap break-all text-red-100/70">{change.originalSnippet}</pre></div><div className="bg-green-900/20 p-3"><div className="text-green-400 mb-1 uppercase text-[9px] font-bold tracking-wider">Suggested</div><pre className="whitespace-pre-wrap break-all text-green-100">{change.improvedSnippet}</pre></div></div></div>))) : (<div className="text-center py-8 text-neutral-600 text-xs italic border border-dashed border-neutral-800 rounded-lg">{review ? "No specific code changes recommended. Good job!" : "Analysis pending..."}</div>)}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {showProblem && <div className="w-1 bg-neutral-800 hover:bg-blue-500 cursor-col-resize transition-colors z-10" onMouseDown={handleDragLeft} />}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage={getMonacoLanguage(language)}
              defaultValue={code}
              theme="vs-dark"
              onChange={(value) => {
                setCode(value || "");
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                // Add custom styling for harness region
                const style = document.createElement('style');
                style.innerHTML = `
      .monaco-editor .harness-readonly {
        background-color: rgba(100, 100, 100, 0.08) !important;
        opacity: 0.7;
      }
      .monaco-editor .harness-border {
        background: linear-gradient(90deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 193, 7, 0) 100%);
        width: 4px !important;
      }
    `;
                document.head.appendChild(style);

                // Find harness boundary
                const codeContent = editor.getValue();
                const lines = codeContent.split('\n');
                const harnessEndLine = lines.findIndex(line =>
                  line.includes('===== YOUR CODE BELOW =====')
                );

                if (harnessEndLine > 0) {
                  // Mark harness region with decorations (Modern API)
                  const harnessDecorations = editor.createDecorationsCollection([
                    {
                      range: new monaco.Range(1, 1, harnessEndLine, Number.MAX_SAFE_INTEGER),
                      options: {
                        isWholeLine: true,
                        className: 'harness-readonly',
                        linesDecorationsClassName: 'harness-border',
                      }
                    }
                  ]);

                  // Auto-fold harness and focus user code
                  setTimeout(() => {
                    // Fold the harness region
                    editor.getAction('editor.foldAll')?.run();

                    // Set cursor to start of user code
                    const userCodeStartLine = harnessEndLine + 2;
                    editor.setPosition({ lineNumber: userCodeStartLine, column: 1 });
                    editor.revealLineInCenter(userCodeStartLine);

                    // Unfold user code area if needed
                    setTimeout(() => {
                      editor.setSelection(new monaco.Range(
                        userCodeStartLine, 1,
                        editor.getModel()?.getLineCount() || userCodeStartLine + 1, 1
                      ));
                      editor.getAction('editor.unfold')?.run();
                      editor.setPosition({ lineNumber: userCodeStartLine, column: 1 });
                    }, 50);
                  }, 150);
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 24,
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                folding: true,
                showFoldingControls: 'always',
                foldingStrategy: 'indentation',
                foldingHighlight: true,
                autoClosingBrackets: 'always',
                autoIndent: 'full',
                formatOnPaste: true,
                formatOnType: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: "on",
              }}
            />
          </div>
          {showConsole && (
            <div className="bg-black border-t border-neutral-700 flex flex-col z-10 shadow-up relative" style={{ height: `${consoleHeight}px` }}>
              <div className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-20 hover:bg-blue-500/50 transition-colors" onMouseDown={handleDragConsole} />
              <div className="h-8 bg-neutral-900 flex items-center justify-between px-4 text-xs font-mono text-neutral-400 border-b border-neutral-800 select-none">
                <div className="flex items-center"><Terminal size={12} className="mr-2" /> CONSOLE OUTPUT</div>
                <div className="flex items-center gap-2"><GripHorizontal size={12} className="text-neutral-600" /><button onClick={() => setShowConsole(false)} className="hover:text-white"><X size={12} /></button></div>
              </div>
              <div className="flex-1 p-3 font-mono text-xs md:text-sm text-green-400/90 overflow-y-auto whitespace-pre-wrap selection:bg-green-900/30">{consoleOutput}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}