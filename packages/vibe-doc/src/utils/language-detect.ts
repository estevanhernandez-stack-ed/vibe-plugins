/**
 * Language Detection Utility
 * Detects programming languages based on package configuration files
 */

export interface DetectedLanguage {
  name: string;
  confidence: number;
}

/**
 * Detects programming languages from a list of package config file paths
 * Returns array of detected languages with confidence scores
 */
export function detectLanguages(
  packageConfigPaths: string[]
): DetectedLanguage[] {
  const languageMap: Map<string, number> = new Map();

  for (const filePath of packageConfigPaths) {
    const fileName = filePath.split('/').pop() || '';

    // Node.js/TypeScript
    if (fileName === 'package.json') {
      languageMap.set('TypeScript/JavaScript', (languageMap.get('TypeScript/JavaScript') || 0) + 1);
    }

    // Python
    if (fileName === 'pyproject.toml' || fileName === 'setup.py') {
      languageMap.set('Python', (languageMap.get('Python') || 0) + 1);
    }

    // Rust
    if (fileName === 'Cargo.toml') {
      languageMap.set('Rust', (languageMap.get('Rust') || 0) + 1);
    }

    // Go
    if (fileName === 'go.mod') {
      languageMap.set('Go', (languageMap.get('Go') || 0) + 1);
    }

    // Java/Kotlin
    if (fileName === 'pom.xml') {
      languageMap.set('Java/Kotlin', (languageMap.get('Java/Kotlin') || 0) + 1);
    }

    if (fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
      languageMap.set('Java/Kotlin', (languageMap.get('Java/Kotlin') || 0) + 1);
    }

    // C# / .NET
    if (fileName === 'project.csproj' || fileName.endsWith('.csproj')) {
      languageMap.set('C#/.NET', (languageMap.get('C#/.NET') || 0) + 1);
    }

    // Ruby
    if (fileName === 'Gemfile') {
      languageMap.set('Ruby', (languageMap.get('Ruby') || 0) + 1);
    }

    // PHP
    if (fileName === 'composer.json') {
      languageMap.set('PHP', (languageMap.get('PHP') || 0) + 1);
    }
  }

  // Convert to array and sort by count (confidence)
  const languages = Array.from(languageMap.entries()).map(([name, count]) => ({
    name,
    confidence: Math.min(count / packageConfigPaths.length, 1),
  }));

  return languages.sort((a, b) => b.confidence - a.confidence);
}
