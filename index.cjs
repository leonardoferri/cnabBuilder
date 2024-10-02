const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

let cnabData = [];

const defaultFilePath = path.join(__dirname, 'cnabExample.rem'); // Especifique o caminho do arquivo padrão aqui

// Endpoint para ler o arquivo CNAB
app.post('/upload', (req, res) => {
    const filePath = req.body.filePath || defaultFilePath; // Use o arquivo padrão se não houver filePath
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading file');
        cnabData = parseCNAB(data);
        res.send(`File read successfully. Using ${filePath === defaultFilePath ? 'default file.' : 'provided file.'}`);
    });
});




// Endpoint para buscar por segmento
app.get('/search/segment/:segment', (req, res) => {
    const segment = req.params.segment;
    const results = cnabData.filter(entry => entry.segment === segment);
    res.json(results);
});

// Endpoint para buscar por nome da empresa
app.get('/search/company/:name', (req, res) => {
    const name = req.params.name.toLowerCase();
    const results = cnabData.filter(entry => entry.company.toLowerCase().includes(name));
    res.json(results);
});

// Endpoint para exportar JSON
app.get('/export', (req, res) => {
    res.json(cnabData);
});

// Função para parsear o arquivo CNAB
function parseCNAB(data) {
    const lines = data.split('\n');
    return lines.map(line => {
        return {
            segment: line.substring(0, 1), // Ajuste conforme necessário
            company: line.substring(10, 30).trim(), // Ajuste conforme necessário
            // Adicione outros campos conforme a estrutura do seu CNAB
        };
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
