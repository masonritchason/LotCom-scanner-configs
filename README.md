# LotCom Scanner Configurations

JavaScript-based configurations for Cognex Scanners in the LotCom Distributed System.

## Updating the script

**Large (non-compatable) changes**
- Create a new template version following the `Template_v{#}` naming convention.
- Add your script code to the file.
- Commit the new template version to Git.
- Upload the script to the Scanners and add the required individual information (IP, process, etc.).
     
**Small (compatable) changes**
- Modify the current template version file.
- Commit the changes to Git.
- Upload the modified script to the Scanners:
  - Either overwrite modified blocks (maintains Scanner-dependent information) or overwrite the entire script (wipes Scanner-dependent information).

>[!NOTE]
> **Scanner-dependent** blocks are conventionally notated by "REPLACE ME". To easily find these regions, use `Ctrl` + `F` to search for "REPLACE ME" and add the necessary information.

>[!WARNING]
> Be sure to notate newly-added Scanner-depenedent blocks when making changes or creating new template versions.  