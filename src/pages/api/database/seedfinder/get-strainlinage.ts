import type { APIRoute } from 'astro';
import { chromium } from 'playwright';

interface LineageNode {
  name: string;
  level: number;
}

interface LineageData {
  lineageData: LineageNode[];
  lineageHtml: string;
}

export const GET: APIRoute = async ({ url }) => {
  let browser;
  try {
    // Obtenemos el strain y breeder de los parámetros
    const strainParam = url.searchParams.get('strain');
    const breederParam = url.searchParams.get('breeder');
    
    if (!strainParam || !breederParam) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requieren los parámetros strain y breeder'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Iniciamos el navegador
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navegamos a la página específica de la cepa
    await page.goto(`https://seedfinder.eu/es/strain-info/${strainParam}/${breederParam}`);
    
    // Extraemos la información de la cepa
    const strainData = await page.evaluate<LineageData>(() => {
      const lineageData: LineageNode[] = [];
      const lineageUl = document.querySelector('#lineage .card ul');
      if (lineageUl) {
        Array.from(lineageUl.querySelectorAll('li')).forEach(li => {
          lineageData.push({
            name: li.textContent?.trim() || '',
            level: parseInt(li.getAttribute('class')?.replace('level-', '') || '0')
          });
        });
      }
      
      const lineageContainer = document.querySelector('#lineage .card div');
      const lineageHtml = lineageContainer ? lineageContainer.outerHTML : '';
      
      return {
        lineageData,
        lineageHtml
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: strainData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error al hacer scraping:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error al obtener datos: ' + (error instanceof Error ? error.message : String(error))
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } finally {
    // Cerramos el navegador al finalizar
    if (browser) await browser.close();
  }
}
