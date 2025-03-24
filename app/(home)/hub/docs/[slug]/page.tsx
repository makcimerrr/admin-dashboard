import React from 'react';
import fs from 'fs';
import path from 'path';
import {notFound} from 'next/navigation';
import {Metadata} from 'next';
import {MDXRemote} from 'next-mdx-remote/rsc';
import {Badge} from '@/components/ui/badge';
import {ChevronRight} from 'lucide-react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {AlertCircle, Check, Copy, Terminal} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import matter from 'gray-matter';
import {serialize} from 'next-mdx-remote/serialize';

export async function generateMetadata({
                                           params
                                       }: {
    params: { slug: string };
}): Promise<Metadata> {
    const {slug} = await params;
    const filePath = path.join(process.cwd(), 'docs', `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
        return {
            title: 'Not Found',
            description: 'Page not found'
        };
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const {data} = matter(fileContent);
    return {
        title: data.title,
        description: data.description
    };
}

export async function generateStaticParams() {
    const docsDir = path.join(process.cwd(), 'docs');
    const filenames = fs.readdirSync(docsDir);
    const slugs = filenames.map((name) => name.replace(/\.mdx$/, ''));
    return slugs.map((slug) => ({slug}));
}

const components = {
    h1: (props: any) => (
        <h1 className="text-4xl font-bold tracking-tight mt-8 mb-4" {...props} />
    ),
    h2: (props: any) => (
        <h2 className="text-3xl font-bold mt-8 mb-4" {...props} />
    ),
    h3: (props: any) => (
        <h3 className="text-2xl font-bold mt-6 mb-3" {...props} />
    ),
    h4: (props: any) => <h4 className="text-xl font-bold mt-4 mb-2" {...props} />,
    p: (props: any) => <p className="my-4 leading-7" {...props} />,
    ul: (props: any) => <ul className="my-6 ml-6 list-disc" {...props} />,
    ol: (props: any) => <ol className="my-6 ml-6 list-decimal" {...props} />,
    li: (props: any) => <li className="mt-2" {...props} />,
    a: (props: any) => (
        <a
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            {...props}
        />
    ),
    blockquote: (props: any) => (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />
    ),
    table: (props: any) => (
        <div className="my-6 w-full overflow-y-auto">
            <table
                className="w-full border-collapse border border-gray-300 dark:border-gray-700"
                {...props}
            />
        </div>
    ),
    tr: (props: any) => (
        <tr
            className="m-0 border-t border-gray-300 dark:border-gray-700 p-0 even:bg-gray-100 dark:even:bg-gray-800"
            {...props}
        />
    ),
    th: (props: any) => (
        <th
            className="border px-4 py-2 text-left font-bold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 [&[align=center]]:text-center [&[align=right]]:text-right"
            {...props}
        />
    ),
    td: (props: any) => (
        <td
            className="border px-4 py-2 text-left text-gray-800 dark:text-gray-200 [&[align=center]]:text-center [&[align=right]]:text-right"
            {...props}
        />
    ),
    pre: (props: any) => (
        <pre
            className="mb-6 mt-6 overflow-x-auto rounded-lg border p-4 bg-gray-50 dark:bg-gray-900"
            {...props}
        />
    ),

    code: (props: any) => (
        <code
            className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
            {...props}
        />
    ),
    Alert: (props: any) => (
        <Alert className="my-6">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>{props.title}</AlertTitle>
            <AlertDescription>{props.children}</AlertDescription>
        </Alert>
    ),
    CodeBlock: ({language, code}: { language: string; code: string }) => (
        <Card className="my-6">
            <CardHeader
                className="flex flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-t-lg">
                <div className="flex items-center">
                    <Terminal className="h-4 w-4 mr-2"/>
                    <CardTitle className="text-sm">{language}</CardTitle>
                </div>
                <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4"/>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
        <pre className="p-4 overflow-auto bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <code className="text-sm text-gray-800 dark:text-gray-200">
            {code}
          </code>
        </pre>
            </CardContent>
        </Card>
    ),
    Badge: (props: any) => (
        <Badge
            className={
                props.variant === 'outline'
                    ? 'variant-outline'
                    : 'bg-blue-600 hover:bg-blue-700'
            }
        >
            {props.children}
        </Badge>
    ),
    CodeTabs: ({children}: { children: React.ReactNode }) => (
        <Tabs defaultValue="javascript" className="w-full my-6">
            {children}
        </Tabs>
    ),
    TabsList: (props: any) => <TabsList {...props} />,
    TabsTrigger: (props: any) => <TabsTrigger {...props} />,
    TabsContent: (props: any) => <TabsContent className="mt-4" {...props} />,
    Table: (props: any) => <Table  {...props} />,
    TableHeader: (props: any) => <TableHeader  {...props} />,
    TableRow: (props: any) => <TableRow  {...props} />,
    TableHead: (props: any) => <TableHead  {...props} />,
    TableBody: (props: any) => <TableBody {...props} />,
    TableCell: (props: any) => <TableCell  {...props} />,


};

export default async function DocPage({
                                          params
                                      }: {
    params: { slug: string };
}) {
    const {slug} = await params;
    const filePath = path.join(process.cwd(), 'docs', `${slug}.mdx`);
    if (!fs.existsSync(filePath)) {
        notFound();
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const {content, data} = matter(fileContent);
    const mdxSource = await serialize(content);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 hover:bg-blue-700">API</Badge>
                    <Badge variant="outline">v1.0</Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">{data.title}</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    {data.description}
                </p>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <span>Dernière mise à jour:</span>
                    <span className="ml-1">{data.updatedAt}</span>
                </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
                <MDXRemote source={content} components={components}/>
            </div>

            <div className="flex justify-between pt-4 border-t">
                {data.prev ? (
                    <Button variant="outline" asChild>
                        <a href={`/hub/docs/${data.prev.slug}`} className="flex items-center">
                            <ChevronRight className="h-4 w-4 mr-2 rotate-180"/>
                            {data.prev.title}
                        </a>
                    </Button>
                ) : (
                    <div></div>
                )}
                {data.next && (
                    <Button variant="outline" asChild>
                        <a href={`/hub/docs/${data.next.slug}`} className="flex items-center">
                            {data.next.title}
                            <ChevronRight className="h-4 w-4 ml-2"/>
                        </a>
                    </Button>
                )}
            </div>
        </div>
    );
}
