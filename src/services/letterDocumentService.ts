import QRCode from 'qrcode'
import PizZip from 'pizzip'
import { downloadLetterTemplateBlob } from './templateService'
import { supabase } from '../lib/supabase'
import type { Letter } from '../lib/supabase'

/**
 * Generate URL for letter view page
 */
const generateLetterViewUrl = (letterId: string): string => {
  const baseUrl = window.location.origin
  return `${baseUrl}/letters?view=${letterId}`
}

/**
 * Generate QR code as base64 data URL
 */
const generateQRCode = async (letterId: string): Promise<string> => {
  try {
    console.log('[letterDocumentService.generateQRCode] Generating QR code for letter:', letterId)

    // Create QR data with only URL (without identifier text)
    const url = generateLetterViewUrl(letterId)

    // Use only URL in QR code
    const qrData = url

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    })

    console.log('[letterDocumentService.generateQRCode] QR code generated successfully')
    return qrCodeDataUrl
  } catch (error) {
    console.error('[letterDocumentService.generateQRCode] Error:', error)
    throw new Error('Ошибка генерации QR-кода')
  }
}

/**
 * Convert data URL to ArrayBuffer
 */
const dataUrlToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.split(',')[1]
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Add QR code image to DOCX template in the upper right corner
 * This function modifies the document.xml to add an image
 */
const addQRCodeToDocument = async (
  zip: PizZip,
  qrCodeDataUrl: string,
  letterId: string
): Promise<PizZip> => {
  try {
    console.log('[letterDocumentService.addQRCodeToDocument] Adding QR code to document')

    // Get document.xml content
    const docXml = zip.file('word/document.xml')?.asText()
    if (!docXml) {
      throw new Error('document.xml not found in DOCX file')
    }

    // Convert QR code to array buffer
    const qrImageBuffer = dataUrlToArrayBuffer(qrCodeDataUrl)

    // Add image to media folder
    const imageName = `qrcode_${letterId}.png`
    zip.file(`word/media/${imageName}`, qrImageBuffer)

    // Get or create _rels for images
    let relsXml = zip.file('word/_rels/document.xml.rels')?.asText()

    if (!relsXml) {
      // Create basic rels structure if it doesn't exist
      relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
    }

    // Count existing relationships to get new ID
    const relationshipMatches = relsXml.match(/<Relationship /g)
    const newRelId = `rId${(relationshipMatches?.length || 0) + 1}`

    // Add image relationship
    const imageRel = `<Relationship Id="${newRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`
    const updatedRelsXml = relsXml.replace('</Relationships>', `${imageRel}</Relationships>`)
    zip.file('word/_rels/document.xml.rels', updatedRelsXml)

    // Add QR code image at the beginning of document (without text identifier)
    // Size: 3cm x 3cm (approximately 1134000 EMUs x 1134000 EMUs, 1 cm ≈ 360000 EMUs)
    const qrCodeXml = `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="0" w:type="auto"/>
          <w:jc w:val="right"/>
        </w:tblPr>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1700" w:type="dxa"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="right"/>
                <w:spacing w:after="0" w:before="0"/>
              </w:pPr>
              <w:r>
                <w:drawing>
                  <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="1134000" cy="1134000"/>
                    <wp:effectExtent l="0" t="0" r="0" b="0"/>
                    <wp:docPr id="1" name="QR Code"/>
                    <wp:cNvGraphicFramePr>
                      <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                    </wp:cNvGraphicFramePr>
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                          <pic:nvPicPr>
                            <pic:cNvPr id="0" name="QR Code"/>
                            <pic:cNvPicPr/>
                          </pic:nvPicPr>
                          <pic:blipFill>
                            <a:blip r:embed="${newRelId}"/>
                            <a:stretch>
                              <a:fillRect/>
                            </a:stretch>
                          </pic:blipFill>
                          <pic:spPr>
                            <a:xfrm>
                              <a:off x="0" y="0"/>
                              <a:ext cx="1134000" cy="1134000"/>
                            </a:xfrm>
                            <a:prstGeom prst="rect">
                              <a:avLst/>
                            </a:prstGeom>
                          </pic:spPr>
                        </pic:pic>
                      </a:graphicData>
                    </a:graphic>
                  </wp:inline>
                </w:drawing>
              </w:r>
            </w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
    `

    // Insert QR code table after the opening body tag
    const updatedDocXml = docXml.replace(
      /<w:body>/,
      `<w:body>${qrCodeXml}`
    )

    zip.file('word/document.xml', updatedDocXml)

    console.log('[letterDocumentService.addQRCodeToDocument] QR code added successfully')
    return zip
  } catch (error) {
    console.error('[letterDocumentService.addQRCodeToDocument] Error:', error)
    throw new Error('Ошибка добавления QR-кода в документ')
  }
}

/**
 * Generate a letter document with QR code
 * @param letterIdOrLetter - Letter ID string or Letter object
 */
export const generateLetterDocument = async (letterIdOrLetter: string | Letter): Promise<Blob> => {
  try {
    console.log('[letterDocumentService.generateLetterDocument] Generating document for letter:', typeof letterIdOrLetter === 'string' ? letterIdOrLetter : letterIdOrLetter.id)

    let letter: Letter

    // Check if we received a letter object or just an ID
    if (typeof letterIdOrLetter === 'string') {
      // Load letter data from database
      const { data, error: letterError } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letterIdOrLetter)
        .single()

      if (letterError || !data) {
        throw new Error('Письмо не найдено')
      }
      letter = data
    } else {
      // Use provided letter object
      letter = letterIdOrLetter
    }

    // Download template
    const templateBlob = await downloadLetterTemplateBlob()
    const templateArrayBuffer = await templateBlob.arrayBuffer()

    // Load template into PizZip
    const zip = new PizZip(templateArrayBuffer)

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(letter.id)

    // Add QR code to document
    const updatedZip = await addQRCodeToDocument(zip, qrCodeDataUrl, letter.id)

    // You can also use docxtemplater here to fill in other fields
    // For now, we'll just add the QR code

    // Generate final DOCX
    const outputBlob = updatedZip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    console.log('[letterDocumentService.generateLetterDocument] Document generated successfully')
    return outputBlob
  } catch (error) {
    console.error('[letterDocumentService.generateLetterDocument] Error:', error)
    throw error
  }
}

/**
 * Download letter document with QR code
 */
export const downloadLetterDocument = async (letter: Letter): Promise<void> => {
  try {
    console.log('[letterDocumentService.downloadLetterDocument] Downloading document for letter:', letter.id)

    // Generate document - pass the whole letter object
    const blob = await generateLetterDocument(letter)

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // Generate filename
    const fileName = `Письмо_${letter.reg_number || letter.number}_${letter.id.substring(0, 8)}.docx`
    link.download = fileName

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cleanup
    window.URL.revokeObjectURL(url)

    console.log('[letterDocumentService.downloadLetterDocument] Document downloaded successfully')
  } catch (error) {
    console.error('[letterDocumentService.downloadLetterDocument] Error:', error)
    throw error
  }
}
