import type { APIRoute } from 'astro';
import { chromium } from 'playwright';

export const GET: APIRoute = async ({ url }) => {
  let browser;
  try {
    // Obtenemos el breeder de los parámetros o usamos uno por defecto
    const breederParam = url.searchParams.get('breeder');
    const breeder = breederParam || 'appalachian-genetics';
    
    // Iniciamos el navegador
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navegamos a la página específica del breeder
    await page.goto(`https://seedfinder.eu/es/database/breeder/${breeder}`);
    
    // Esperamos a que cargue la tabla de cepas
    await page.waitForSelector('table');
    
    // Extraemos la información de las cepas
    const strains = await page.evaluate(() => {
      const result = [];
      const rows = document.querySelectorAll('table tbody tr');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 5) {
          const strainLink = cells[0].querySelector('a');
          
          result.push({
            name: strainLink?.textContent?.trim() || '',
            url: strainLink?.href || '',
            breeder: cells[1]?.textContent?.trim() || '',
            floweringTime: cells[2]?.textContent?.trim() || '',
            genetics: cells[3]?.textContent?.trim() || '',
            feminized: cells[4]?.textContent?.trim() || ''
          });
        }
      }
      return result;
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: strains,
      breeder
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
