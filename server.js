const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WordPress Configuration - SUAS CREDENCIAIS
const wpConfig = {
    site1: {
        url: 'https://kiensueno.com',
        username: 'Drinko',
        password: 'AlKy 4Hao pRkB wsqN O0tA 9Vja'
    },
    site2: {
        url: 'https://cesartenorio.com',
        username: 'julio',
        password: 'd5V9 50Ye hcvF MDKm 5THl XLN2'
    }
};

// Template do botão com countdown
const buttonTemplate = `
<style>
    @media not all and (hover: none) and (pointer: coarse) {
        .only-mobile { display: none !important; }
    }
    @media all and (hover: none) and (pointer: coarse) {
        .only-mobile { display: block !important; }
    }
</style>
<div class="only-mobile">
    <h3 style="text-align: center;">VOCÊ ENCONTRARÁ O <span style="color: #ff0000;">DOWNLOAD</span> LOGO ABAIXO</h3>
</div>
<center>
<div id="countdown" style="font-weight: bold; font-size: 24px;">30 segundos</div>
<div style="text-align: center;">
    <a href="{{NEXT_URL}}">
        <button id="nextButton" style="display:none; background: #1a5276; border-radius: 0; padding: 10px 20px; cursor: pointer; color: #fff; border: none; font-size: 18px; font-weight: bold;">Próximo</button>
    </a>
</div>
<script>
    var seconds = 30;
    function countdown() {
        seconds--;
        if (seconds < 0) {
            if (isMobileDevice()) {
                document.getElementById("nextButton").style.display = "inline-block";
            }
            document.getElementById("countdown").style.display = "none";
        } else {
            document.getElementById("countdown").innerHTML = seconds + " segundos";
            setTimeout(countdown, 1000);
        }
    }
    countdown();
    function isMobileDevice() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    if (!isMobileDevice()) {
        document.getElementById("countdown").style.display = "none";
        document.getElementById("nextButton").style.display = "none";
    }
<\/script>
</center>
`;

// Função para criar página no WordPress
async function createWordPressPage(siteConfig, title, content) {
    try {
        const auth = Buffer.from(`${siteConfig.username}:${siteConfig.password}`).toString('base64');
        
        console.log(`Criando página: ${title} em ${siteConfig.url}`);
        
        const response = await axios.post(`${siteConfig.url}/wp-json/wp/v2/pages`, {
            title: title,
            content: content,
            status: 'publish'
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log(`Página criada: ${response.data.link}`);
        return response.data;
        
    } catch (error) {
        console.error('Erro ao criar página:', error.response?.data || error.message);
        throw new Error(`Erro: ${error.response?.data?.message || error.message}`);
    }
}

// API: Criar funil
app.post('/api/create-funnel', async (req, res) => {
    try {
        const { title, originalLink } = req.body;
        
        if (!title || !originalLink) {
            return res.status(400).json({ 
                success: false, 
                error: 'Título e link são obrigatórios' 
            });
        }

        console.log(`🚀 Criando funil: ${title}`);
        
        const pages = [];
        let currentSite = 'site1';
        
        // Criar 4 páginas alternando entre sites
        for (let i = 1; i <= 4; i++) {
            const isLastPage = i === 4;
            const nextUrl = isLastPage ? originalLink : 'TEMP_NEXT_URL';
            
            const content = buttonTemplate.replace('{{NEXT_URL}}', nextUrl);
            const pageTitle = `${title} - Página ${i}`;
            
            const siteConfig = wpConfig[currentSite];
            
            const page = await createWordPressPage(siteConfig, pageTitle, content);
            
            pages.push({
                site: currentSite,
                url: page.link,
                id: page.id,
                title: pageTitle,
                pageNumber: i
            });
            
            console.log(`✅ Página ${i} criada: ${page.link}`);
            
            // Alternar entre sites
            currentSite = currentSite === 'site1' ? 'site2' : 'site1';
            
            // Aguardar entre criações
            if (i < 4) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Atualizar URLs para criar o looping
        console.log('🔗 Conectando páginas...');
        
        for (let i = 0; i < pages.length - 1; i++) {
            const currentPage = pages[i];
            const nextPage = pages[i + 1];
            
            const updatedContent = buttonTemplate.replace('{{NEXT_URL}}', nextPage.url);
            const siteConfig = wpConfig[currentPage.site];
            const auth = Buffer.from(`${siteConfig.username}:${siteConfig.password}`).toString('base64');
            
            await axios.post(`${siteConfig.url}/wp-json/wp/v2/pages/${currentPage.id}`, {
                content: updatedContent
            }, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
        }

        const funnel = {
            id: Date.now(),
            title,
            originalLink,
            pages,
            createdAt: new Date().toISOString(),
            clicks: 0
        };

        console.log(`🎉 Funil "${title}" criado com sucesso!`);
        
        res.json({
            success: true,
            message: `Funil "${title}" criado com sucesso!`,
            funnel: funnel
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rotas
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: '🚀 LIKT API funcionando!', 
        timestamp: new Date().toISOString() 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor LIKT rodando na porta ${PORT}`);
});

module.exports = app;
