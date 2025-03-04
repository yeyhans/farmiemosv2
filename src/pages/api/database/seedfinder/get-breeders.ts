import type { APIRoute } from 'astro';
import { chromium } from 'playwright';

// Variables para el sistema de caché
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

export const GET: APIRoute = async () => {
  // Verificar si tenemos datos en caché que sean válidos
  const currentTime = Date.now();
  if (cachedData && (currentTime - lastFetchTime < CACHE_DURATION)) {
    console.log('Sirviendo datos desde caché');
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  let browser;
  try {
    // Iniciamos el navegador
    browser = await chromium.launch({ 
      headless: true,
      // Estos args pueden ayudar en entornos serverless
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    
    // Establecer un timeout más bajo para prevenir bloqueos
    page.setDefaultTimeout(15000);
    
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
    
    // Guardar en caché
    cachedData = { 
      success: true, 
      data: breeders,
      count: breeders.length
    };
    lastFetchTime = currentTime;
    
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error al hacer scraping:', error);
    
    // Si hay un error pero tenemos caché, usar la caché aunque sea antigua
    if (cachedData) {
      console.log('Error en scraping actual, sirviendo datos de caché antiguos');
      return new Response(JSON.stringify({
        ...cachedData,
        fromStaleCache: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
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
