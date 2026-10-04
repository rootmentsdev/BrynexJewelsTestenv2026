

// const baseUrl = {
//     baseUrl: import.meta.env.VITE_API_URL,
// }

// MAIN



  




const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const baseUrl = {
     baseUrl: isLocalhost ? 'http://localhost:7000/' : 'https://jewels.brynexapparels.in/',
}
export default baseUrl


// http://localhost:7000/   
// https://jewels.brynexapparels.in/

