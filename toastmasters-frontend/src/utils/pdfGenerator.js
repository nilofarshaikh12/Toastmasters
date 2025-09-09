import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (element, fileName = 'document') => {
  try {
    // Simple PDF generation
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      logging: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);
    
    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
