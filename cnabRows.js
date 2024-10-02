'use strict';

import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import chalk from 'chalk';

// Configuração das opções do CLI
const optionsYargs = yargs(process.argv.slice(2))
  .usage(chalk.blue('Uso: $0 [options]'))
  .option("f", { alias: "from", describe: "posição inicial de pesquisa da linha do Cnab", type: "number", demandOption: true })
  .option("t", { alias: "to", describe: "posição final de pesquisa da linha do Cnab", type: "number", demandOption: true })
  .option("s", { alias: "segmento", describe: "tipo de segmento", type: "string", demandOption: true })
  .option("p", { alias: "path", describe: "caminho do arquivo CNAB", type: "string" }) // Opcional
  .option("e", { alias: "empresa", describe: "nome da empresa para busca", type: "string" }) // Nova opção
  .option("j", { alias: "json", describe: "exportar informações para arquivo JSON", type: "string" }) // Nova opção para JSON
  .example(chalk.green('$0 -f 21 -t 34 -s p -p ./cnabExample.rem -e "Nome da Empresa" -j output.json'), 'exporta informações para JSON')
  .argv;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultFilePath = path.resolve(`${__dirname}/cnabExample.rem`);
const filePath = optionsYargs.path || defaultFilePath;

const { from, to, segmento, empresa, json } = optionsYargs;

// Função para fatiar um array com posições específicas
const sliceArrayPosition = (arr, ...positions) => [...arr].slice(...positions);

// Função para gerar log da mensagem
const createMessageLog = (segmento, segmentoType, from, to, companyName) => `
${chalk.yellow('----- Cnab linha ' + segmentoType + ' -----')}

posição from: ${chalk.inverse.bgBlack(from)}

posição to: ${chalk.inverse.bgBlack(to)}

item isolado: ${chalk.inverse.bgBlack(segmento.substring(from - 1, to))}

Nome da empresa: ${chalk.inverse.bgBlack(companyName)}

item dentro da linha ${segmentoType}: 
  ${segmento.substring(0, from)}${chalk.inverse.bgBlack(segmento.substring(from - 1, to))}${segmento.substring(to)}

${chalk.yellow('----- FIM ------')}
`;

const log = console.log;

// Função principal de leitura do arquivo CNAB
const main = async () => {
  console.time(chalk.blue('leitura Async'));
  log(chalk.green(`Utilizando o arquivo: ${filePath}`));

  try {
    const fileContent = await readFile(filePath, 'utf8');
    const cnabArray = fileContent.split('\n');

    if (empresa) {
      await handleCompanySearch(cnabArray);
    } else {
      handleSegmentSearch(cnabArray);
    }
  } catch (error) {
    log(chalk.red(`Erro ao ler o arquivo: ${error}`));
  }

  console.timeEnd(chalk.blue('leitura Async'));
};

// Função para tratar a busca por empresas
const handleCompanySearch = async (cnabArray) => {
  const results = findCompanyInCnab(cnabArray, empresa);

  if (results.length > 0) {
    results.forEach(result => {
      log(chalk.green(`Empresa encontrada: ${result.fullName} (Endereço: ${result.fullAddress}, Linha: ${result.lineIndex}, Segmento: ${result.segment})`));
    });

    if (json) {
      await exportResultsToJson(results, json);
    }
  } else {
    log(chalk.yellow(`Nenhuma empresa encontrada com o nome "${empresa}".`));
  }
};

// Função para buscar empresa no CNAB
const findCompanyInCnab = (cnabArray, companyName) => {
  return cnabArray.reduce((results, line, index) => {
    if (line.includes(companyName)) {
      const segmentType = line.charAt(0);
      const fullAddress = extractFullAddress(line);
      results.push({
        fullName: companyName,
        fullAddress,
        lineIndex: index + 1,
        segment: segmentType
      });
    }
    return results;
  }, []);
};

// Função para extrair o nome da empresa
const extractCompanyName = (segmento) => {
  const companyNamePosition = 10; // Ajuste conforme necessário
  return segmento.substring(companyNamePosition, companyNamePosition + 30).trim();
};

// Função para extrair o endereço completo
const extractFullAddress = (segmento) => {
  const addressPosition = 40; // Ajuste conforme necessário
  return segmento.substring(addressPosition, addressPosition + 60).trim(); // Ajuste o tamanho do substring
};

// Função para exportar resultados para JSON
const exportResultsToJson = async (results, jsonFilePath) => {
  try {
    await writeFile(jsonFilePath, JSON.stringify(results, null, 2));
    log(chalk.green(`Dados exportados para ${jsonFilePath}`));
  } catch (err) {
    log(chalk.red(`Erro ao exportar para JSON: ${err}`));
  }
};

// Função para tratar busca por segmentos
const handleSegmentSearch = (cnabArray) => {
  const segmentFunctions = {
    p: () => handleSegment(cnabArray[2], 'P'),
    q: () => handleSegment(cnabArray[3], 'Q'),
    r: () => handleSegment(cnabArray[4], 'R'),
  };

  const segmentHandler = segmentFunctions[segmento];

  if (segmentHandler) {
    segmentHandler();
  } else {
    log(chalk.red('Segmento inválido.'));
  }
};

// Função para lidar com cada segmento
const handleSegment = (segmento, segmentoType) => {
  const companyName = extractCompanyName(segmento);
  log(createMessageLog(segmento, segmentoType, from, to, companyName));
};

// Inicia a execução
main();
