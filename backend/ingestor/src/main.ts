import { Command } from 'commander';
import { processFilesCommand } from './commands/process-files.command';
import { watchCommand } from './commands/watch.command';

const program = new Command();

program
  .name('ingestor')
  .description('CLI for processing log files')
  .version('1.0.0')
  .addCommand(processFilesCommand)
  .addCommand(watchCommand);

program.parse(process.argv); 