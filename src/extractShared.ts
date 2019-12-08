import {workspace, Uri, OutputChannel} from 'vscode';

import {TSESTreeOptions} from '@typescript-eslint/typescript-estree';
import {AST, parse} from '@typescript-eslint/typescript-estree/dist/parser';

export async function findTextInFiles(regex: string): Promise<Uri[]>{
	const foundResults: Uri[] = [];
	const exclude = workspace.getConfiguration('findUnusedExports').exclude;
	await workspace.findTextInFiles({pattern: regex, isMultiline: false, isRegExp: true}, {exclude: exclude}, (result) => {
		foundResults.push(result.uri);
	});
	return foundResults;
}

export interface ExtractedExport {
	fileName: string;
	exportName: string;
	lineNumber: number;
}

export async function getAst(stringPath: string): Promise<AST<TSESTreeOptions>> {
	const text = (await workspace.fs.readFile(Uri.file(stringPath))).toString();
	return parse(text) as unknown as AST<TSESTreeOptions>;
}


export function convertUriToPathRelativeToRoot(uri: Uri): string {
	return workspace.asRelativePath(uri);
}

export function unique<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}


export function getUniqueUris(uris: Uri[]): Uri[] {
	return unique(uris.map(uri => uri.toString())).map(uriStr => Uri.file(uriStr));
}


interface SortedExport {
	file: string;
	exports: ExportNameAndLine[];
}

export interface ExportNameAndLine{
	name: string;
	line: number;
}

export function formatOutputString(unusedExports: ExtractedExport[]): SortedExport[] {
	const uniqueFiles = unique(unusedExports.map(unusedExport => unusedExport.fileName));
	return uniqueFiles.map(file => {
		const exportsInFile = unusedExports.filter(unusedExport => {
			return unusedExport.fileName === file;
		});
		return {
			file: file,
			exports: exportsInFile.map(unusedExport => {
				return {
					name: unusedExport.exportName,
					line: unusedExport.lineNumber
				};
			})
		};
	
	});
}

export function printOutputString(sortedExports: SortedExport[], outputChannel: OutputChannel): void{
	sortedExports.forEach((sortedExport, index) => {
		outputChannel.appendLine((index + 1) + ') ' + sortedExport.file);
		sortedExport.exports.forEach(unusedExport => {
			outputChannel.appendLine(`     ${unusedExport.name} [${unusedExport.line}]` );
		});
		outputChannel.appendLine('');
	});
}