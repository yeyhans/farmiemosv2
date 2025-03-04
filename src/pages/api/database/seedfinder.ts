import type { APIRoute } from 'astro';
import { chromium } from 'playwright';

export const GET: APIRoute = async () => {
  let browser;
  try {
    // Iniciamos el navegador
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navegamos a la página principal de cultivadores
    await page.goto('https://seedfinder.eu/es/database/breeder/');
    
    // Extraemos los datos de todos los cultivadores
    const breeders = await page.evaluate(() => {
      const result = [];
      
      // Obtenemos todas las secciones alfabéticas (0-9, A, B, C, etc.)
      const sections = document.querySelectorAll('h3');
      
      sections.forEach(section => {
        // Obtenemos la letra/sección
        const sectionName = section.textContent?.trim();
        
        // Buscamos la lista de cultivadores que sigue a cada encabezado
        let breedersListElement = section.nextElementSibling;
        while (breedersListElement && breedersListElement.tagName !== 'UL') {
          breedersListElement = breedersListElement.nextElementSibling;
        }
        
        if (breedersListElement && breedersListElement.tagName === 'UL') {
          // Obtenemos todos los elementos de la lista (cada uno es un cultivador)
          const breederItems = breedersListElement.querySelectorAll('li');
          
          breederItems.forEach(item => {
            const link = item.querySelector('a');
            if (link) {
              // Extraemos el nombre del cultivador y la cantidad de cepas
              const fullText = link.textContent || '';
              const name = fullText.replace(/\(\d+\)$/, '').trim();
              
              // Extraemos la cantidad de cepas (número entre paréntesis)
              const strainCountMatch = fullText.match(/\((\d+)\)$/);
              const strainCount = strainCountMatch ? parseInt(strainCountMatch[1]) : 0;
              
              // Obtenemos la URL del cultivador
              const href = link.getAttribute('href') || '';
              
              result.push({
                name,
                strainCount,
                section: sectionName,
                url: new URL(href, 'https://seedfinder.eu').toString()
              });
            }
          });
        }
      });
      
      return result;
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: breeders,
      count: breeders.length
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
