import {Uri, workspace} from 'vscode';

import {ExtractedExport, findTextInFiles} from './extractShared';

export async function getUnusedExports(exportObjects: ExtractedExport[]): Promise<ExtractedExport[]>{
	return exportObjects.filter(async(exportObject) => {
		const importingUris = await getUrisThatImportExportingModule(exportObject);
		return !validateUrisThatImportExportingModule(exportObject, importingUris);
	});
}

async function getUrisThatImportExportingModule(exportObject: ExtractedExport): Promise<Uri[]> {
	const moduleName = exportObject.fileName.split('/').slice(-1)[0];
	const individualImportRegex = `import.*{.*[\W,]*${exportObject}.*?\W*[,}].* from .*${moduleName}`;
	const packageImportRegex = `import\\W+\*from .*${moduleName}`;
	const importResults: Uri[] = [];
	importResults.concat(await findTextInFiles(individualImportRegex));
	importResults.concat(await findTextInFiles(packageImportRegex));
	return importResults;
}

async function validateUrisThatImportExportingModule(exportObject: ExtractedExport, importFileUris: Uri[]): Promise<boolean> {
	const validatedUris = importFileUris.map(async(importFileUri) => {
		return await validateUriThatImportsExportingModule(exportObject, importFileUri);
	});
	return validatedUris.some(importUri => importUri);

}

async function validateUriThatImportsExportingModule(exportObject: ExtractedExport, importFileUri: Uri): Promise<boolean> {
	const matches = await getFilteredMatchingImportStatementsFromUri(exportObject, importFileUri);
	return (await matches).length > 0;
}

export async function getFilteredMatchingImportStatementsFromUri(exportObject: ExtractedExport, importFileUri: Uri): Promise<MatchingImportStatement[]>{
	const unfilteredMatches = await getAllMatchingImportStatementsFromUri(exportObject, importFileUri);
	const filteredMatches = filterMatchingImportStatements(exportObject, unfilteredMatches, importFileUri);
	return filteredMatches;
}


export async function getAllMatchingImportStatementsFromUri(exportObject: ExtractedExport, importFileUri: Uri): Promise<MatchingImportStatement[]>{
	const fileText = (await workspace.fs.readFile(importFileUri)).toString();
	const namedImports = getNamedImportStatementsFromFileText(exportObject, fileText);
	const renamedImports = getRenamedImportStatementsFromFileText(exportObject, fileText);
	const packageImports = getPackageImportStatementsFromFileText(exportObject, fileText);
	return namedImports.concat(renamedImports).concat(packageImports);
}

export function getNamedImportStatementsFromFileText(exportObject: ExtractedExport, fileText: string): MatchingImportStatement[] {
	const moduleName = exportObject.fileName.split('/').slice(-1)[0].split('\\').slice(-1)[0].split('.')[0];
	const importRegex = new RegExp(`.*import.*[{,\\W]+${exportObject.exportName}[},\\W]+.*from\\W+(['"].*${moduleName}['"])`, 'g');
	const matches = [...fileText.matchAll(importRegex)]
		.filter(match => {
			return fileText.match(exportObject.exportName)!.length>1; 
		})
		.map(match =>{
			return {
				fullImportStatement: match[0],
				exportFileRelativePath: match[1]

			};
		});
	return matches;
}

export function getRenamedImportStatementsFromFileText(exportObject: ExtractedExport, fileText: string): MatchingImportStatement[] {
	const moduleName = exportObject.fileName.split('/').slice(-1)[0].split('\\').slice(-1)[0].split('.')[0];
	const importRegex = new RegExp(`.*import.*[{,\\W]+${exportObject.exportName}\\W+as\\W+(.*?)[},\\W]+.*from\\W+(['"].*${moduleName}['"])`, 'g');
	const matches = [...fileText.matchAll(importRegex)]
		.filter(match => {
			return fileText.match(match[1])!.length>1; 
		})
		.map(match =>{
			return {
				fullImportStatement: match[0],
				exportFileRelativePath: match[2]

			};
		});
	return matches;
}

function getPackageImportStatementsFromFileText(exportObject: ExtractedExport, fileText: string): MatchingImportStatement[] {
	const moduleName = exportObject.fileName.split('/').slice(-1)[0].split('\\').slice(-1)[0].split('.')[0];
	const importRegex = new RegExp(`.*import\\W+\*\\W+as\\W+(.*?)\\Wfrom\\W+(['"].*${moduleName}['"])`, 'g');
	const matches = [...fileText.matchAll(importRegex)]
		.filter(match => {
			return fileText.search(match[1]+ '.' + exportObject.exportName) > -1;
		})
		.map(match =>{
			return {
				fullImportStatement: match[0],
				exportFileRelativePath: match[2]

			};
		});
	return matches;
}


export function filterMatchingImportStatements(exportObject: ExtractedExport, unfilteredMatches: MatchingImportStatement[], importFileUri: Uri): MatchingImportStatement[]{
	const importFileAbsolutePath = importFileUri.path;
	const filteredMatches = unfilteredMatches.filter(match => {
		const exportFileRelativePath = match.exportFileRelativePath;
		const absoluteImportPath = convertRelativePathToAbsolute(exportFileRelativePath, importFileAbsolutePath);
		return absoluteImportPath === exportObject.fileName;
	});
	return filteredMatches;
}
export function convertRelativePathToAbsolute(exportModuleRelativePath: string, importFileAbsolutePath: string): string {
	const splImportFileAbsolutePath = importFileAbsolutePath.split('/');
	const splExportModuleRelativePath = exportModuleRelativePath.split('/');
	splImportFileAbsolutePath.pop();
	splExportModuleRelativePath.forEach(part => {
		if (part === '..'){
			splImportFileAbsolutePath.pop();
		}
		else if (part !== '.'){
			splImportFileAbsolutePath.push(part);
		}
	});
	return splImportFileAbsolutePath.join('/').substr(1);
}

export interface MatchingImportStatement{
	fullImportStatement: string;
	exportFileRelativePath: string;
}
