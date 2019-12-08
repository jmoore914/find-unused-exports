import {Uri} from 'vscode';

import {getAst, convertUriToPathRelativeToRoot, ExportNameAndLine, ExtractedExport, unique, findTextInFiles} from './extractShared';
import {TSESTreeOptions} from '@typescript-eslint/typescript-estree';
import {AST} from '@typescript-eslint/typescript-estree/dist/parser';
import {TSEnumDeclaration, ExportNamedDeclaration, MemberExpression, Identifier, DeclarationStatement, ExpressionStatement, AssignmentExpression, ObjectExpression, Property} from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';



export async function getAllExports(): Promise<ExtractedExport[]> {
	const urisWithExports = unique(await getAllUrisWithExports());
	const extracted = await Promise.all(urisWithExports.map(async (uri) => await extractExports(uri)));
	return extracted.flat();
}

async function getAllUrisWithExports(): Promise<string[]> {
	return (await findTextInFiles('export .*')).map(uri => uri.path);

}


export async function extractExports(stringPath: string): Promise<ExtractedExport[]> {
	const ast = await getAst(stringPath);
	const fileName = convertUriToPathRelativeToRoot(Uri.file(stringPath));

	const individualExports = getIndividualExports(ast);
	const objectExports = getObjectExports(ast);
	const extractedExports = individualExports
		.concat(objectExports)
		.map(namedExport => {
			return {
				fileName: fileName,
				exportName: namedExport.name,
				lineNumber: namedExport.line

			};
		});
	const defaultExportLine = getDefaultExport(ast);
	if (defaultExportLine) {
		extractedExports.push({
			fileName: fileName,
			exportName: '',
			lineNumber: defaultExportLine
		});
	}
	return extractedExports;
}



export function getIndividualExports(ast: AST<TSESTreeOptions>): ExportNameAndLine[] {
	return ast.body
		.filter(node => {
			return node.type === 'ExportNamedDeclaration';
		})
		.map(namedDeclaration => {
			const exportNamedDeclaration = namedDeclaration as DeclarationStatement as ExportNamedDeclaration;
			return {name: (exportNamedDeclaration.declaration as TSEnumDeclaration).id.name,
				line: exportNamedDeclaration.loc.start.line};
		});
}

export function getDefaultExport(ast: AST<TSESTreeOptions>): number | undefined {
	return (ast.body.find(node => {
		return node.type === 'ExportDefaultDeclaration';
	}))?.loc.start.line;
}

export function getObjectExports(ast: AST<TSESTreeOptions>): ExportNameAndLine[] {
	const objectExpressions = ast.body
		.filter(node => {
			return node.type === 'ExpressionStatement';
		})
		.map(node => {
			return (node as ExpressionStatement).expression;
		});
	const assignmentExpressions = objectExpressions
		.filter(expression => {
			return expression.type === 'AssignmentExpression';
		})
		.map(expression => {
			return (expression as AssignmentExpression);
		});
	const moduleExportObject = findModuleExportObject(assignmentExpressions);
	const extractedIds = moduleExportObject ? extractIdsFromModuleExportObject(moduleExportObject) : [];
	return extractedIds;
}

function findModuleExportObject(assignmentExpressions: AssignmentExpression[]): AssignmentExpression | undefined {
	return assignmentExpressions.find(assignmentExpression => {
		const isMemberExpression = assignmentExpression.left.type === 'MemberExpression';
		if (isMemberExpression) {
			const memberExpression = assignmentExpression.left as MemberExpression;
			const isIdentifier = memberExpression.object.type === 'Identifier';
			if (isIdentifier) {
				const identifier = memberExpression.object as Identifier;
				const isModule = identifier.name === 'module';
				if (isModule) {
					const isExports = memberExpression.property.type === 'Identifier' &&
                        (memberExpression.property as Identifier).name === 'exports';
					return isExports;
				}
			}
		}
		return undefined;
		
	});
}

function extractIdsFromModuleExportObject(assignmentExpression: AssignmentExpression): ExportNameAndLine[] {
	const exports = assignmentExpression.right as ObjectExpression;
	exports.properties.filter(property => {
		const isProperty = property.type === 'Property';
		return (isProperty && (property as Property).key.type === 'Identifier');
        
	});
	return exports.properties.map(property => {
		return {
			name: ((property as Property).key as Identifier).name,
			line: property.loc.start.line
		};
	});
}
