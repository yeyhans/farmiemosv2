import type { APIRoute } from 'astro';
import { chromium } from 'playwright';

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
    const strainData = await page.evaluate(() => {
      // Información básica
      const name = document.querySelector('.card h1')?.textContent?.trim() || '';
      const breeder = document.querySelector('.card small')?.textContent?.replace('producido de', '')?.trim() || '';
      
      // Obtener todo el HTML de la tarjeta de información completa
      const infoCardElement = document.querySelector('.card');
      const infoCardHtml = infoCardElement ? infoCardElement.outerHTML : '';
      
      // Extraer la descripción
      const descriptionElement = document.querySelector('#basic-info + p');
      const description = descriptionElement ? descriptionElement.innerHTML : '';
      
      // Extraer información sobre tipo, tiempo de floración, etc.
      const basicInfoText = document.querySelector('.card p:nth-of-type(2)')?.textContent || '';
      const typeMatch = basicInfoText.match(/is an (.*?) from/);
      const type = typeMatch ? typeMatch[1].trim() : '';
      
      const floweringTimeMatch = basicInfoText.match(/tiempo de floración de (.*?)\)/);
      const floweringTime = floweringTimeMatch ? floweringTimeMatch[1].trim() : '';
      
      // Extraer información de degustación
      const effect = document.querySelector('#degustation .card')?.textContent?.trim() || '';
      const aroma = document.querySelector('#degustation .card:nth-of-type(2)')?.textContent?.trim() || '';
      const taste = document.querySelector('#degustation .card:nth-of-type(3)')?.textContent?.trim() || '';
      
      // Extraer información del linaje - versión mejorada
      let lineageData = [];
      const lineageUl = document.querySelector('#lineage .card ul');
      if (lineageUl) {
        lineageData = Array.from(lineageUl.querySelectorAll('li')).map(li => {
          return {
            name: li.textContent?.trim() || '',
            level: parseInt(li.getAttribute('class')?.replace('level-', '') || '0')
          };
        });
      }
      
      // Obtener también el HTML para referencia
      const lineageContainer = document.querySelector('#lineage .card div');
      const lineageHtml = lineageContainer ? lineageContainer.outerHTML : '';
      
      // Extraer URLs de imágenes si están disponibles
      const imageUrls = Array.from(document.querySelectorAll('.gallery img')).map(img => {
        return (img as HTMLImageElement).src;
      });
      
      // Extraer características adicionales de la descripción
      const characteristicsMatches = description.match(/Genética: (.*?)<br>.*?Tipo: (.*?)<br>.*?Floración exterior: (.*?)<br>.*?Floración interior: (.*?)<br>.*?Producción en exterior: (.*?)<br>.*?Producción interior: (.*?)(?:<br>|$)/s);
      
      const characteristics = characteristicsMatches ? {
        genetics: characteristicsMatches[1]?.trim() || '',
        seedType: characteristicsMatches[2]?.trim() || '',
        outdoorFlowering: characteristicsMatches[3]?.trim() || '',
        indoorFlowering: characteristicsMatches[4]?.trim() || '',
        outdoorYield: characteristicsMatches[5]?.trim() || '',
        indoorYield: characteristicsMatches[6]?.trim() || ''
      } : null;
      
      return {
        name,
        breeder,
        description,
        type,
        floweringTime,
        effect,
        aroma,
        taste,
        lineageData,
        lineageHtml,
        imageUrls,
        characteristics,
        infoCardHtml
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
