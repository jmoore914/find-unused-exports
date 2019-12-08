import * as vscode from 'vscode';

import {convertRelativePathToAbsolute, getImportStatementsFromFileText, getAllMatchingImportStatementsFromUri, getFilteredMatchingImportStatementsFromUri, filterMatchingImportStatements, MatchingImportStatement} from '../../extractImports';
import * as assert from 'assert';

suite('Convert relative path to absolute path', () => {

	test('Should convert properly', async () => {
		const filePath = 'src/test/suite/extractImports.js';
		const relativePath = '../../extractImports';
		const converted = convertRelativePathToAbsolute(relativePath, filePath);
		assert.deepStrictEqual(converted, 'src/extractImports');
	});

});

suite('Match all imports', () => {
	test('getImportStatementsFromFileText', async () => {
		const importFilePath = __dirname.split('\\out\\')[0] + '\\src\\extractExports.ts';
		const exportFilePath = __dirname.split('\\out\\')[0] + '\\src\\extractShared.ts';
		const exportObject = {fileName: exportFilePath, exportName: 'ExtractedExport'};
		const fileText = (await vscode.workspace.fs.readFile(vscode.Uri.file(importFilePath))).toString();
		const matches = getImportStatementsFromFileText(exportObject, fileText);
    
		const expectedResult = [
			{
				fullImportStatement: "import {getAst, convertUriToPathRelativeToRoot, getUniqueUris, ExtractedExport} from './extractShared'",
				exportFileRelativePath: "'./extractShared'"
			}
		];
		assert.deepStrictEqual(matches, expectedResult);
	});

	test('getAllMatchingImportStatementsFromUri', async () => {
		const importFilePath = __dirname.split('\\out\\')[0] + '\\src\\extractExports.ts';
		const importUri = vscode.Uri.file(importFilePath);
		const exportFilePath = __dirname.split('\\out\\')[0] + '\\src\\extractShared.ts';
		const exportObject = {fileName: exportFilePath, exportName: 'ExtractedExport'};
		const matches = await getAllMatchingImportStatementsFromUri(exportObject, importUri);
		const expectedResult = [
			{
				fullImportStatement: "import {getAst, convertUriToPathRelativeToRoot, getUniqueUris, ExtractedExport} from './extractShared'",
				exportFileRelativePath: "'./extractShared'"
			}
		];
		assert.deepStrictEqual(matches, expectedResult);
	});
	test('filterMatchingImportStatements', () => {
    
		const importFilePathA = './src/js/imports/filePath';
		const importFilePathB = './src/random/imports/filePathB';

		const exportFileRelativePathA = '../exports/filePath';
		const exportFileRelativePathB = '../../js/exports/filePath';
		
	
		const matchingImportStatements  = [
			{
				fullImportStatement: 'import {whatever} from  ' + exportFileRelativePathA,
				exportFileRelativePath: exportFileRelativePathA
			},
			{
				fullImportStatement: 'import {whatever} from  ' + exportFileRelativePathB,
				exportFileRelativePath: exportFileRelativePathB
			}
		];
	
      

		const exportFilePath = './src/js/exports/filePath';
		const exportObject = {fileName: exportFilePath, exportName: 'whatever'};
    
		const filtered1 = filterMatchingImportStatements(exportObject, matchingImportStatements, vscode.Uri.file(importFilePathA));
		const filtered2 = filterMatchingImportStatements(exportObject, matchingImportStatements, vscode.Uri.file(importFilePathB));

		assert.equal(JSON.stringify(filtered1), JSON.stringify(matchingImportStatements));
		assert.equal(JSON.stringify(filtered2), JSON.stringify([matchingImportStatements[1]]));
         
	});

});