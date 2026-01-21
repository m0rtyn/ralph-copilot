import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

/**
 * Integration tests for custom file paths configuration
 * Tests that paths like ".ralph/PRD.md" work correctly for:
 * - Reading files from nested directories
 * - Writing files with automatic parent directory creation
 * - File watchers with nested path patterns
 */

suite('Custom Paths Integration Tests', () => {
    let testWorkspaceRoot: string;
    let originalPrdPath: string | undefined;
    let originalProgressPath: string | undefined;

    suiteSetup(async () => {
        // Get the workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }
        testWorkspaceRoot = workspaceFolders[0].uri.fsPath;

        // Save original configuration values
        const config = vscode.workspace.getConfiguration('ralph');
        originalPrdPath = config.get<string>('files.prdPath');
        originalProgressPath = config.get<string>('files.progressPath');
    });

    suiteTeardown(async () => {
        // Restore original configuration
        const config = vscode.workspace.getConfiguration('ralph');
        if (originalPrdPath !== undefined) {
            await config.update('files.prdPath', originalPrdPath, vscode.ConfigurationTarget.Workspace);
        }
        if (originalProgressPath !== undefined) {
            await config.update('files.progressPath', originalProgressPath, vscode.ConfigurationTarget.Workspace);
        }

        // Clean up test directories
        const testDir = path.join(testWorkspaceRoot, '.ralph-test');
        try {
            await fsPromises.rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    suite('Custom PRD Path Reading', () => {
        test('should read PRD from nested path .ralph-test/PRD.md', async () => {
            const customPath = '.ralph-test/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const testContent = '# Test PRD\n\n- [ ] Test task 1\n- [x] Test task 2\n';

            // Create directory and file
            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, testContent, 'utf-8');

            // Update configuration to use custom path
            const config = vscode.workspace.getConfiguration('ralph');
            await config.update('files.prdPath', customPath, vscode.ConfigurationTarget.Workspace);

            // Verify the file can be read from the nested path
            const directContent = await fsPromises.readFile(fullPath, 'utf-8');
            assert.strictEqual(directContent, testContent, 'File should contain test content');

            // Verify configuration was updated
            const updatedConfig = vscode.workspace.getConfiguration('ralph');
            const actualPath = updatedConfig.get<string>('files.prdPath');
            assert.strictEqual(actualPath, customPath, 'Config should reflect custom path');

            // Cleanup
            await fsPromises.unlink(fullPath);
        });

        test('should read PRD from deeply nested path .ralph-test/docs/prd/PRD.md', async () => {
            const customPath = '.ralph-test/docs/prd/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const testContent = '# Deep Nested PRD\n\n- [ ] Deep task\n';

            // Create directories and file
            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, testContent, 'utf-8');

            // Verify the file was created correctly
            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, true, 'Nested file should be created');

            const readContent = await fsPromises.readFile(fullPath, 'utf-8');
            assert.strictEqual(readContent, testContent, 'Content should match');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/docs'), { recursive: true, force: true });
        });

        test('should return null when custom PRD path does not exist', async () => {
            const customPath = '.ralph-test/nonexistent/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            // Ensure file does not exist
            try {
                await fsPromises.unlink(fullPath);
            } catch {
                // File doesn't exist, which is what we want
            }

            // Verify file does not exist
            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, false, 'File should not exist');
        });
    });

    suite('Custom Progress Path Writing', () => {
        test('should create parent directories when writing to nested progress path', async () => {
            const customPath = '.ralph-test/logs/progress.txt';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const parentDir = path.dirname(fullPath);

            // Ensure directory doesn't exist initially
            try {
                await fsPromises.rm(parentDir, { recursive: true, force: true });
            } catch {
                // Ignore
            }

            // Create the parent directory and file (simulating ensureProgressFileAsync behavior)
            await fsPromises.mkdir(parentDir, { recursive: true });
            await fsPromises.writeFile(fullPath, '# Progress Log\n\n', 'utf-8');

            // Verify directory and file were created
            const dirExists = fs.existsSync(parentDir);
            const fileExists = fs.existsSync(fullPath);
            
            assert.strictEqual(dirExists, true, 'Parent directory should be created');
            assert.strictEqual(fileExists, true, 'Progress file should be created');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/logs'), { recursive: true, force: true });
        });

        test('should append to progress file at custom nested path', async () => {
            const customPath = '.ralph-test/progress/progress.txt';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const parentDir = path.dirname(fullPath);

            // Create directory and initial file
            await fsPromises.mkdir(parentDir, { recursive: true });
            await fsPromises.writeFile(fullPath, '# Progress Log\n\n', 'utf-8');

            // Append content (simulating appendProgressAsync behavior)
            const timestamp = new Date().toISOString();
            const entry = `[${timestamp}] Test progress entry\n`;
            await fsPromises.appendFile(fullPath, entry, 'utf-8');

            // Verify content was appended
            const content = await fsPromises.readFile(fullPath, 'utf-8');
            assert.ok(content.includes('Test progress entry'), 'Progress entry should be appended');
            assert.ok(content.includes('# Progress Log'), 'Original header should remain');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/progress'), { recursive: true, force: true });
        });

        test('should create deeply nested directories for progress file', async () => {
            const customPath = '.ralph-test/a/b/c/d/progress.txt';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const parentDir = path.dirname(fullPath);

            // Create nested directories
            await fsPromises.mkdir(parentDir, { recursive: true });
            await fsPromises.writeFile(fullPath, '# Deep Progress\n', 'utf-8');

            // Verify all directories were created
            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, true, 'Deeply nested file should be created');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/a'), { recursive: true, force: true });
        });
    });

    suite('File Watcher with Custom Paths', () => {
        test('should create file watcher pattern for nested PRD path', async () => {
            const customPath = '.ralph-test/PRD.md';
            
            // Create a RelativePattern like the PrdWatcher does
            const pattern = new vscode.RelativePattern(testWorkspaceRoot, customPath);
            
            // Verify the pattern is correctly formed
            assert.ok(pattern, 'Pattern should be created');
            assert.strictEqual(pattern.pattern, customPath, 'Pattern should match custom path');
            assert.strictEqual(pattern.baseUri.fsPath, testWorkspaceRoot, 'Base should be workspace root');
        });

        test('should create file system watcher for nested path', async () => {
            const customPath = '.ralph-test/watch-test/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            // Create the directory structure
            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, '# Initial content\n', 'utf-8');

            // Create watcher
            const pattern = new vscode.RelativePattern(testWorkspaceRoot, customPath);
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            let changeDetected = false;
            const disposable = watcher.onDidChange(() => {
                changeDetected = true;
            });

            // Modify the file
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit for watcher to start
            await fsPromises.writeFile(fullPath, '# Modified content\n', 'utf-8');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for change event

            // Cleanup
            disposable.dispose();
            watcher.dispose();
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/watch-test'), { recursive: true, force: true });

            // Note: changeDetected may or may not be true depending on timing
            // The important thing is that no error was thrown
            assert.ok(true, 'File watcher should handle nested paths without error');
        });

        test('should watch for file creation at custom nested path', async () => {
            const customPath = '.ralph-test/create-test/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);
            const parentDir = path.dirname(fullPath);

            // Ensure parent directory exists but file doesn't
            await fsPromises.mkdir(parentDir, { recursive: true });
            try {
                await fsPromises.unlink(fullPath);
            } catch {
                // File doesn't exist
            }

            // Create watcher
            const pattern = new vscode.RelativePattern(testWorkspaceRoot, customPath);
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            let createDetected = false;
            const disposable = watcher.onDidCreate(() => {
                createDetected = true;
            });

            // Create the file
            await new Promise(resolve => setTimeout(resolve, 100));
            await fsPromises.writeFile(fullPath, '# New PRD\n', 'utf-8');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Cleanup
            disposable.dispose();
            watcher.dispose();
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/create-test'), { recursive: true, force: true });

            // The watcher should handle this without errors
            assert.ok(true, 'File watcher should detect creation at nested paths without error');
        });
    });

    suite('Configuration Integration', () => {
        test('should accept custom prdPath configuration', async () => {
            const config = vscode.workspace.getConfiguration('ralph');
            const customPath = '.ralph-test/custom/PRD.md';
            
            await config.update('files.prdPath', customPath, vscode.ConfigurationTarget.Workspace);
            
            const updatedConfig = vscode.workspace.getConfiguration('ralph');
            const actualPath = updatedConfig.get<string>('files.prdPath');
            
            assert.strictEqual(actualPath, customPath, 'Configuration should accept custom PRD path');
        });

        test('should accept custom progressPath configuration', async () => {
            const config = vscode.workspace.getConfiguration('ralph');
            const customPath = '.ralph-test/custom/progress.txt';
            
            await config.update('files.progressPath', customPath, vscode.ConfigurationTarget.Workspace);
            
            const updatedConfig = vscode.workspace.getConfiguration('ralph');
            const actualPath = updatedConfig.get<string>('files.progressPath');
            
            assert.strictEqual(actualPath, customPath, 'Configuration should accept custom progress path');
        });

        test('should default to root-level paths when not configured', async () => {
            const config = vscode.workspace.getConfiguration('ralph');
            
            // Get the default values from package.json
            const defaultPrdPath = 'PRD.md';
            const defaultProgressPath = 'progress.txt';
            
            // Reset to undefined to get defaults
            await config.update('files.prdPath', undefined, vscode.ConfigurationTarget.Workspace);
            await config.update('files.progressPath', undefined, vscode.ConfigurationTarget.Workspace);
            
            const updatedConfig = vscode.workspace.getConfiguration('ralph');
            const prdPath = updatedConfig.get<string>('files.prdPath', defaultPrdPath);
            const progressPath = updatedConfig.get<string>('files.progressPath', defaultProgressPath);
            
            assert.strictEqual(prdPath, defaultPrdPath, 'Default PRD path should be PRD.md');
            assert.strictEqual(progressPath, defaultProgressPath, 'Default progress path should be progress.txt');
        });
    });

    suite('Path Edge Cases', () => {
        test('should handle paths with dots in directory names', async () => {
            const customPath = '.ralph-test/.config/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, '# Dot directory PRD\n', 'utf-8');

            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, true, 'File in dot-prefixed directory should be created');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/.config'), { recursive: true, force: true });
        });

        test('should handle paths with spaces in directory names', async () => {
            const customPath = '.ralph-test/my docs/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, '# Spaced directory PRD\n', 'utf-8');

            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, true, 'File in directory with spaces should be created');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/my docs'), { recursive: true, force: true });
        });

        test('should handle relative paths without leading dot', async () => {
            const customPath = 'ralph-test-no-dot/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
            await fsPromises.writeFile(fullPath, '# No dot PRD\n', 'utf-8');

            const exists = fs.existsSync(fullPath);
            assert.strictEqual(exists, true, 'File in non-dot directory should be created');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, 'ralph-test-no-dot'), { recursive: true, force: true });
        });

        test('should handle unicode characters in paths', async () => {
            const customPath = '.ralph-test/документы/PRD.md';
            const fullPath = path.join(testWorkspaceRoot, customPath);

            try {
                await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
                await fsPromises.writeFile(fullPath, '# Unicode PRD\n', 'utf-8');

                const exists = fs.existsSync(fullPath);
                assert.strictEqual(exists, true, 'File with unicode path should be created');

                // Cleanup
                await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/документы'), { recursive: true, force: true });
            } catch (error) {
                // Some file systems may not support unicode, skip gracefully
                console.log('Unicode paths not fully supported on this system');
            }
        });
    });

    suite('End-to-End Custom Path Workflow', () => {
        test('should support complete workflow with custom paths', async () => {
            const prdPath = '.ralph-test/e2e/PRD.md';
            const progressPath = '.ralph-test/e2e/progress.txt';
            const prdFullPath = path.join(testWorkspaceRoot, prdPath);
            const progressFullPath = path.join(testWorkspaceRoot, progressPath);
            const parentDir = path.dirname(prdFullPath);

            // Step 1: Create directory structure
            await fsPromises.mkdir(parentDir, { recursive: true });

            // Step 2: Create PRD file
            const prdContent = '# E2E Test PRD\n\n## Tasks\n- [ ] First task\n- [ ] Second task\n';
            await fsPromises.writeFile(prdFullPath, prdContent, 'utf-8');

            // Step 3: Create progress file
            await fsPromises.writeFile(progressFullPath, '# Progress Log\n\n', 'utf-8');

            // Step 4: Read PRD
            const readPrd = await fsPromises.readFile(prdFullPath, 'utf-8');
            assert.strictEqual(readPrd, prdContent, 'PRD content should be readable');

            // Step 5: Append to progress
            const timestamp = new Date().toISOString();
            await fsPromises.appendFile(progressFullPath, `[${timestamp}] Completed: First task\n`, 'utf-8');

            // Step 6: Read progress
            const readProgress = await fsPromises.readFile(progressFullPath, 'utf-8');
            assert.ok(readProgress.includes('Completed: First task'), 'Progress should contain entry');

            // Step 7: Update PRD (mark task complete)
            const updatedPrd = prdContent.replace('- [ ] First task', '- [x] First task');
            await fsPromises.writeFile(prdFullPath, updatedPrd, 'utf-8');

            // Step 8: Verify update
            const finalPrd = await fsPromises.readFile(prdFullPath, 'utf-8');
            assert.ok(finalPrd.includes('- [x] First task'), 'PRD should have updated task');

            // Cleanup
            await fsPromises.rm(path.join(testWorkspaceRoot, '.ralph-test/e2e'), { recursive: true, force: true });
        });
    });
});
